const prisma = require("../lib/prisma");

function parseId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function normalizeBoolean(value, defaultValue = true) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === "0" || value === 0) {
    return false;
  }

  return null;
}

function serializeMenu(menu) {
  return {
    id: menu.id,
    name: menu.name,
    route: menu.route,
    icon: menu.icon,
    parentId: menu.parentId,
    sortOrder: menu.sortOrder,
    isActive: menu.isActive,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt
  };
}

async function getMenus(req, res, next) {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          id: "asc"
        }
      ]
    });

    return res.json({
      data: menus.map(serializeMenu)
    });
  } catch (error) {
    next(error);
  }
}

async function getMenusByRole(req, res, next) {
  try {
    const roleId = parseId(req.params.roleId);

    if (!roleId) {
      return res.status(400).json({
        message: "roleId tidak valid"
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        id: roleId
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!role) {
      return res.status(404).json({
        message: "Role tidak ditemukan"
      });
    }

    const roleMenus = await prisma.roleMenu.findMany({
      where: {
        roleId
      },
      include: {
        menu: true
      },
      orderBy: {
        menu: {
          sortOrder: "asc"
        }
      }
    });

    return res.json({
      data: roleMenus.map((item) => serializeMenu(item.menu)),
      role
    });
  } catch (error) {
    next(error);
  }
}

async function createMenu(req, res, next) {
  try {
    const {
      name,
      route,
      icon,
      parentId,
      sortOrder,
      isActive
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Nama menu wajib diisi"
      });
    }

    let parsedParentId = null;

    if (
      parentId !== undefined &&
      parentId !== null &&
      parentId !== ""
    ) {
      parsedParentId = parseId(parentId);

      if (!parsedParentId) {
        return res.status(400).json({
          message: "parentId tidak valid"
        });
      }

      const parent = await prisma.menu.findUnique({
        where: {
          id: parsedParentId
        }
      });

      if (!parent) {
        return res.status(400).json({
          message: "Parent menu tidak ditemukan"
        });
      }
    }

    let parsedSortOrder = 0;

    if (sortOrder !== undefined) {
      parsedSortOrder = Number(sortOrder);

      if (
        !Number.isInteger(parsedSortOrder) ||
        parsedSortOrder < 0
      ) {
        return res.status(400).json({
          message: "sortOrder harus berupa angka bulat >= 0"
        });
      }
    }

    const parsedIsActive = normalizeBoolean(isActive, true);

    if (parsedIsActive === null) {
      return res.status(400).json({
        message: "isActive tidak valid"
      });
    }

    const menu = await prisma.menu.create({
      data: {
        name: String(name).trim(),
        route: normalizeNullableString(route),
        icon: normalizeNullableString(icon),
        parentId: parsedParentId,
        sortOrder: parsedSortOrder,
        isActive: parsedIsActive
      }
    });

    return res.status(201).json({
      message: "Menu berhasil dibuat",
      data: serializeMenu(menu)
    });
  } catch (error) {
    next(error);
  }
}

async function updateMenu(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID menu tidak valid"
      });
    }

    const existingMenu = await prisma.menu.findUnique({
      where: {
        id
      }
    });

    if (!existingMenu) {
      return res.status(404).json({
        message: "Menu tidak ditemukan"
      });
    }

    const {
      name,
      route,
      icon,
      parentId,
      sortOrder,
      isActive
    } = req.body;

    const data = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          message: "Nama menu tidak boleh kosong"
        });
      }

      data.name = String(name).trim();
    }

    if (route !== undefined) {
      data.route = normalizeNullableString(route);
    }

    if (icon !== undefined) {
      data.icon = normalizeNullableString(icon);
    }

    if (parentId !== undefined) {
      if (
        parentId === null ||
        parentId === ""
      ) {
        data.parentId = null;
      } else {
        const parsedParentId = parseId(parentId);

        if (!parsedParentId) {
          return res.status(400).json({
            message: "parentId tidak valid"
          });
        }

        if (parsedParentId === id) {
          return res.status(400).json({
            message: "Menu tidak boleh menjadi parent dirinya sendiri"
          });
        }

        const parent = await prisma.menu.findUnique({
          where: {
            id: parsedParentId
          }
        });

        if (!parent) {
          return res.status(400).json({
            message: "Parent menu tidak ditemukan"
          });
        }

        data.parentId = parsedParentId;
      }
    }

    if (sortOrder !== undefined) {
      const parsedSortOrder = Number(sortOrder);

      if (
        !Number.isInteger(parsedSortOrder) ||
        parsedSortOrder < 0
      ) {
        return res.status(400).json({
          message: "sortOrder harus berupa angka bulat >= 0"
        });
      }

      data.sortOrder = parsedSortOrder;
    }

    if (isActive !== undefined) {
      const parsedIsActive = normalizeBoolean(isActive);

      if (parsedIsActive === null) {
        return res.status(400).json({
          message: "isActive tidak valid"
        });
      }

      data.isActive = parsedIsActive;
    }

    const menu = await prisma.menu.update({
      where: {
        id
      },
      data
    });

    return res.json({
      message: "Menu berhasil diperbarui",
      data: serializeMenu(menu)
    });
  } catch (error) {
    next(error);
  }
}

async function deleteMenu(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID menu tidak valid"
      });
    }

    const menu = await prisma.menu.findUnique({
      where: {
        id
      }
    });

    if (!menu) {
      return res.status(404).json({
        message: "Menu tidak ditemukan"
      });
    }

    const children = await prisma.menu.count({
      where: {
        parentId: id
      }
    });

    if (children > 0) {
      return res.status(409).json({
        message:
          "Menu tidak dapat dihapus karena masih memiliki child menu"
      });
    }

    await prisma.menu.delete({
      where: {
        id
      }
    });

    return res.json({
      message: "Menu berhasil dihapus"
    });
  } catch (error) {
    next(error);
  }
}

async function updateRoleMenus(req, res, next) {
  try {
    const roleId = parseId(req.params.roleId);

    if (!roleId) {
      return res.status(400).json({
        message: "roleId tidak valid"
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

    const { menuIds } = req.body;

    if (!Array.isArray(menuIds)) {
      return res.status(400).json({
        message: "menuIds harus berupa array"
      });
    }

    const parsedMenuIds = [
      ...new Set(
        menuIds
          .map((id) => Number(id))
          .filter(
            (id) => Number.isInteger(id) && id > 0
          )
      )
    ];

    if (parsedMenuIds.length !== menuIds.length) {
      return res.status(400).json({
        message: "Terdapat menu ID yang tidak valid"
      });
    }

    const menus = await prisma.menu.findMany({
      where: {
        id: {
          in: parsedMenuIds
        }
      },
      select: {
        id: true
      }
    });

    if (menus.length !== parsedMenuIds.length) {
      return res.status(400).json({
        message: "Terdapat menu yang tidak ditemukan"
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({
        where: {
          roleId
        }
      });

      if (parsedMenuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: parsedMenuIds.map((menuId) => ({
            roleId,
            menuId
          })),
          skipDuplicates: true
        });
      }
    });

    const roleMenus = await prisma.roleMenu.findMany({
      where: {
        roleId
      },
      include: {
        menu: true
      },
      orderBy: {
        menu: {
          sortOrder: "asc"
        }
      }
    });

    return res.json({
      message: "Akses menu role berhasil diperbarui",
      data: roleMenus.map((item) => serializeMenu(item.menu))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMenus,
  getMenusByRole,
  createMenu,
  updateMenu,
  deleteMenu,
  updateRoleMenus
};