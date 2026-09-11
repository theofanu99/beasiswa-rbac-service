const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");


const prisma = require("../lib/prisma");

const {
  sendApplicantCredentials
} = require("./email-service");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateTemporaryPassword() {
  const randomPart = crypto
    .randomBytes(6)
    .toString("hex");

  return `Aa1!${randomPart}`;
}

async function getUserWithAccess(where) {
  return prisma.user.findFirst({
    where,
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });
}

function mapUserAccess(user) {
  const roles = user.userRoles.map(
    (userRole) => userRole.role.name
  );

  const permissions = [
    ...new Set(
      user.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map(
          (rolePermission) =>
            rolePermission.permission.name
        )
      )
    )
  ];

  return {
    roles,
    permissions
  };
}

async function registerApplicant({
  nik,
  namaLengkap,
  email
}) {
  const normalizedNik = String(nik || "").trim();

  const normalizedName = String(
    namaLengkap || ""
  ).trim();

  const normalizedEmail = normalizeEmail(email);

  if (
    !normalizedNik ||
    !normalizedName ||
    !normalizedEmail
  ) {
    throw createHttpError(
      "NIK, nama lengkap, dan email wajib diisi",
      400
    );
  }

  if (!/^\d{16}$/.test(normalizedNik)) {
    throw createHttpError(
      "NIK harus terdiri dari tepat 16 digit angka",
      400
    );
  }

  if (
    normalizedName.length < 2 ||
    normalizedName.length > 100
  ) {
    throw createHttpError(
      "Nama lengkap harus terdiri dari 2 sampai 100 karakter",
      400
    );
  }

  if (!validateEmail(normalizedEmail)) {
    throw createHttpError(
      "Format email tidak valid",
      400
    );
  }

  const existingUser =
    await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: normalizedNik
          },
          {
            email: normalizedEmail
          }
        ]
      }
    });

  if (existingUser) {
    throw createHttpError(
      "NIK atau email sudah terdaftar",
      409
    );
  }

  const applicantRole =
    await prisma.role.findUnique({
      where: {
        name: "APPLICANT"
      }
    });

  if (!applicantRole) {
    throw createHttpError(
      "Role APPLICANT belum tersedia pada sistem",
      500
    );
  }

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash = await bcrypt.hash(
    temporaryPassword,
    12
  );

  let createdUser = null;

  try {
    createdUser = await prisma.user.create({
      data: {
        username: normalizedNik,
        email: normalizedEmail,
        passwordHash,
        isActive: true,

        userRoles: {
          create: {
            roleId: applicantRole.id
          }
        }
      },

      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });
  } catch (error) {
    if (error?.code === "P2002") {
      throw createHttpError(
        "NIK atau email sudah terdaftar",
        409
      );
    }

    throw error;
  }

  try {
    await sendApplicantCredentials({
      to: normalizedEmail,
      namaLengkap: normalizedName,
      username: normalizedNik,
      temporaryPassword
    });
  } catch (error) {
    /*
     * Jangan meninggalkan akun yang kredensialnya
     * tidak berhasil dikirim.
     */
    try {
      await prisma.user.delete({
        where: {
          id: createdUser.id
        }
      });
    } catch (cleanupError) {
      console.error(
        "Gagal melakukan rollback akun registrasi:",
        cleanupError.message
      );
    }

    if (error.status) {
      throw error;
    }

    throw createHttpError(
      "Akun tidak dapat dibuat karena pengiriman email gagal",
      503
    );
  }

  return createdUser;
}

async function login(identifier, password) {
  const normalizedIdentifier = String(
    identifier || ""
  ).trim();

  const normalizedEmail =
    normalizeEmail(normalizedIdentifier);

  const user = await getUserWithAccess({
    OR: [
      {
        username: normalizedIdentifier
      },
      {
        email: normalizedEmail
      }
    ]
  });

  if (!user || !user.isActive) {
    throw createHttpError(
      "Username atau password salah",
      401
    );
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw createHttpError(
      "Username atau password salah",
      401
    );
  }

  const {
    roles,
    permissions
  } = mapUserAccess(user);

  const accessToken = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roles,
      permissions
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "15m"
    }
  );

  const refreshToken = crypto
    .randomBytes(64)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      Number(
        process.env
          .REFRESH_TOKEN_EXPIRES_DAYS || 7
      )
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt
    }
  });

  return {
    accessToken,
    refreshToken,

    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions
    }
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw createHttpError(
      "Refresh token tidak ditemukan",
      401
    );
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const storedToken =
    await prisma.refreshToken.findUnique({
      where: {
        tokenHash
      },

      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

  if (!storedToken) {
    throw createHttpError(
      "Refresh token tidak valid",
      401
    );
  }

  if (storedToken.revokedAt) {
    throw createHttpError(
      "Refresh token sudah tidak berlaku",
      401
    );
  }

  if (storedToken.expiresAt <= new Date()) {
    throw createHttpError(
      "Refresh token sudah expired",
      401
    );
  }

  if (!storedToken.user.isActive) {
    throw createHttpError(
      "User tidak aktif",
      403
    );
  }

  const {
    roles,
    permissions
  } = mapUserAccess(storedToken.user);

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id
    },

    data: {
      revokedAt: new Date()
    }
  });

  const accessToken = jwt.sign(
    {
      sub: storedToken.user.id,
      username: storedToken.user.username,
      roles,
      permissions
    },
    process.env.JWT_SECRET,

    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "15m"
    }
  );

  const newRefreshToken = crypto
    .randomBytes(64)
    .toString("hex");

  const newTokenHash = crypto
    .createHash("sha256")
    .update(newRefreshToken)
    .digest("hex");

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      Number(
        process.env
          .REFRESH_TOKEN_EXPIRES_DAYS || 7
      )
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      userId: storedToken.user.id,
      expiresAt
    }
  });

  return {
    accessToken,
    refreshToken: newRefreshToken
  };
}

async function logout(refreshToken) {
  if (!refreshToken) {
    return;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },

    data: {
      revokedAt: new Date()
    }
  });
}

module.exports = {
  registerApplicant,
  login,
  refresh,
  logout
};