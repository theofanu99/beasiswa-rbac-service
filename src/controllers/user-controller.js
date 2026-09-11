const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: (user.userRoles || []).map((userRole) => userRole.role)
  };
}

async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { id: "desc" }
    });

    return res.json({
      data: users.map(serializeUser)
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, email, password, roleId, isActive } = req.body;

    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Username, email, dan password wajib diisi"
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        message: "Password minimal 8 karakter"
      });
    }

    if (roleId === undefined || roleId === null || roleId === "") {
      return res.status(400).json({
        message: "Role wajib dipilih"
      });
    }

    const parsedRoleId = Number(roleId);
    if (!Number.isInteger(parsedRoleId) || parsedRoleId <= 0) {
      return res.status(400).json({
        message: "Role tidak valid"
      });
    }

    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId }
    });

    if (!role) {
      return res.status(404).json({
        message: "Role tidak ditemukan"
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: normalizedUsername },
          { email: normalizedEmail }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username atau email sudah digunakan"
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        isActive: isActive === undefined ? true : Boolean(isActive),
        userRoles: {
          create: {
            roleId: parsedRoleId
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    return res.status(201).json({
      message: "User berhasil dibuat",
      data: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "ID user tidak valid"
      });
    }

    const { email, password, isActive, roleId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    const data = {};

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({
          message: "Email tidak boleh kosong"
        });
      }

      const emailOwner = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: userId }
        }
      });

      if (emailOwner) {
        return res.status(409).json({
          message: "Email sudah digunakan"
        });
      }

      data.email = normalizedEmail;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (password !== undefined && password !== "") {
      if (String(password).length < 8) {
        return res.status(400).json({
          message: "Password minimal 8 karakter"
        });
      }

      data.passwordHash = await bcrypt.hash(String(password), 12);
    }

    let parsedRoleId = null;
    if (roleId !== undefined) {
      parsedRoleId = Number(roleId);

      if (!Number.isInteger(parsedRoleId) || parsedRoleId <= 0) {
        return res.status(400).json({
          message: "Role tidak valid"
        });
      }

      const role = await prisma.role.findUnique({
        where: { id: parsedRoleId }
      });

      if (!role) {
        return res.status(404).json({
          message: "Role tidak ditemukan"
        });
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      if (parsedRoleId !== null) {
        await tx.userRole.deleteMany({
          where: { userId }
        });

        await tx.userRole.create({
          data: {
            userId,
            roleId: parsedRoleId
          }
        });
      }

      return tx.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          }
        }
      });
    });

    return res.json({
      message: "User berhasil diperbarui",
      data: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUserId = Number(req.user?.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "ID user tidak valid"
      });
    }

    if (userId === currentUserId) {
      return res.status(400).json({
        message: "Akun yang sedang digunakan tidak dapat dihapus"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.json({
      message: "User berhasil dihapus"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
