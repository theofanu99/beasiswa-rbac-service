const prisma = require("../lib/prisma");

async function getRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        id: "asc"
      }
    });

    const data = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(
        (item) => item.permission
      ),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }));

    return res.json({
      data
    });
  } catch (error) {
    next(error);
  }
}

async function createRole(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const description =
      req.body.description === undefined ||
      req.body.description === null
        ? null
        : String(req.body.description).trim();

    if (!name) {
      return res.status(400).json({
        message: "Nama role wajib diisi"
      });
    }

    const existingRole = await prisma.role.findUnique({
      where: {
        name
      }
    });

    if (existingRole) {
      return res.status(409).json({
        message: "Role sudah ada"
      });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: description || null
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(201).json({
      message: "Role berhasil dibuat",
      data: {
        ...role,
        permissions: []
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID role tidak valid"
      });
    }

    const existingRole = await prisma.role.findUnique({
      where: {
        id
      }
    });

    if (!existingRole) {
      return res.status(404).json({
        message: "Role tidak ditemukan"
      });
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();

      if (!name) {
        return res.status(400).json({
          message: "Nama role wajib diisi"
        });
      }

      if (name !== existingRole.name) {
        const duplicateRole = await prisma.role.findUnique({
          where: {
            name
          }
        });

        if (duplicateRole) {
          return res.status(409).json({
            message: "Nama role sudah digunakan"
          });
        }
      }

      data.name = name;
    }

    if (req.body.description !== undefined) {
      data.description =
        req.body.description === null
          ? null
          : String(req.body.description).trim();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "Tidak ada data role yang diperbarui"
      });
    }

    const role = await prisma.role.update({
      where: {
        id
      },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
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

    return res.json({
      message: "Role berhasil diperbarui",
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(
          (item) => item.permission
        ),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateRolePermissions(req, res, next) {
  try {
    const roleId = Number(req.params.id);
    const { permissionIds } = req.body;

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({
        message: "ID role tidak valid"
      });
    }

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        message: "permissionIds harus berupa array"
      });
    }

    const normalizedPermissionIds = [
      ...new Set(
        permissionIds.map((permissionId) =>
          Number(permissionId)
        )
      )
    ];

    if (
      normalizedPermissionIds.some(
        (permissionId) =>
          !Number.isInteger(permissionId) ||
          permissionId <= 0
      )
    ) {
      return res.status(400).json({
        message: "Ada permission ID yang tidak valid"
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        id: roleId
      }
    });

    if (!role) {
      return res.status(404).json({
        message: "Role tidak ditemukan"
      });
    }

    const permissions =
      normalizedPermissionIds.length > 0
        ? await prisma.permission.findMany({
            where: {
              id: {
                in: normalizedPermissionIds
              }
            },
            select: {
              id: true,
              name: true,
              description: true
            }
          })
        : [];

    if (
      permissions.length !==
      normalizedPermissionIds.length
    ) {
      return res.status(400).json({
        message: "Ada permission yang tidak ditemukan"
      });
    }

    const updatedRole =
      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({
          where: {
            roleId
          }
        });

        if (normalizedPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: normalizedPermissionIds.map(
              (permissionId) => ({
                roleId,
                permissionId
              })
            )
          });
        }

        return tx.role.findUnique({
          where: {
            id: roleId
          },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            permissions: {
              select: {
                permission: {
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
      message: "Permission role berhasil diperbarui",
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions:
          updatedRole.permissions.map(
            (item) => item.permission
          ),
        createdAt: updatedRole.createdAt,
        updatedAt: updatedRole.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteRole(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID role tidak valid"
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({
        message: "Role tidak ditemukan"
      });
    }

    if (role._count.userRoles > 0) {
      return res.status(409).json({
        message:
          "Role tidak dapat dihapus karena masih digunakan oleh user"
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: id
        }
      });

      await tx.role.delete({
        where: {
          id
        }
      });
    });

    return res.json({
      message: "Role berhasil dihapus"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRoles,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole
};