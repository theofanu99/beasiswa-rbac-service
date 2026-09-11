require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../src/lib/prisma");

const roles = [
  {
    name: "APPLICANT",
    description: "Calon peserta beasiswa"
  },
  {
    name: "VERIFIKATOR",
    description: "Petugas verifikasi seleksi administrasi"
  },
  {
    name: "LEMBAGA SELEKSI",
    description: "Petugas proses seleksi wawancara"
  },
  {
    name: "ADMIN",
    description: "Administrator sistem"
  }
];

const permissions = [
  ["user.read", "Melihat data user"],
  ["user.create", "Membuat user"],
  ["user.update", "Mengubah data user"],
  ["user.delete", "Menghapus user"],

  ["role.read", "Melihat role"],
  ["role.create", "Membuat role"],
  ["role.update", "Mengubah role"],

  ["permission.read", "Melihat daftar permission"],

  ["beasiswa.read", "Melihat data beasiswa"],
  ["beasiswa.create", "Membuat beasiswa"],
  ["beasiswa.update", "Mengubah beasiswa"],

  ["pendaftaran.read", "Melihat pendaftaran"],
  ["pendaftaran.create", "Membuat pendaftaran"],
  ["pendaftaran.update", "Mengubah pendaftaran"],
  ["pendaftaran.submit", "Submit pendaftaran"],

  ["menu.read", "Melihat menu system"],
  ["menu.create", "Membuat menu system"],
  ["menu.update", "Mengubah menu system"],
  ["menu.delete", "Menghapus menu system"],

  ["verifikasi.read", "Melihat proses verifikasi"],
  ["verifikasi.update", "Mengubah proses verifikasi"],

  ["wawancara.read", "Melihat data wawancara"],
  ["wawancara.update", "Mengubah data wawancara"],

  ["dokumen.upload", "Upload dokumen"],
  ["dokumen.read", "Melihat dokumen"],
  ["dokumen.delete", "Menghapus dokumen"]
];

async function main() {
  console.log("🌱 Seeding RBAC database...");
  console.log("");

  // =====================================================
  // CREATE PERMISSIONS
  // =====================================================

  const permissionRecords = [];

  for (const [name, description] of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        name
      },
      update: {
        description
      },
      create: {
        name,
        description
      }
    });

    permissionRecords.push(permission);
  }

  console.log(
    `✅ ${permissionRecords.length} permissions created/updated`
  );

  // =====================================================
  // CREATE ROLES
  // =====================================================

  const roleRecords = [];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: {
        name: roleData.name
      },
      update: {
        description: roleData.description
      },
      create: roleData
    });

    roleRecords.push(role);
  }

  console.log(
    `✅ ${roleRecords.length} roles created/updated`
  );

  // =====================================================
  // HELPER
  // =====================================================

  async function getRole(roleName) {
    const role = roleRecords.find(
      (item) => item.name === roleName
    );

    if (!role) {
      throw new Error(
        `Role ${roleName} tidak ditemukan`
      );
    }

    return role;
  }

  async function getPermission(permissionName) {
    const permission = permissionRecords.find(
      (item) => item.name === permissionName
    );

    if (!permission) {
      throw new Error(
        `Permission ${permissionName} tidak ditemukan`
      );
    }

    return permission;
  }

  // =====================================================
  // ASSIGN PERMISSION
  // =====================================================

  async function assignPermissions(
    roleName,
    permissionNames
  ) {
    const role = await getRole(roleName);

    for (const permissionName of permissionNames) {
      const permission =
        await getPermission(permissionName);

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }

    console.log(
      `✅ ${roleName} permissions assigned`
    );
  }

  // =====================================================
  // ADMIN GETS ALL PERMISSIONS
  // =====================================================

  const adminRole = await getRole("ADMIN");

  for (const permission of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });
  }

  console.log(
    "✅ ADMIN permissions assigned"
  );

  // =====================================================
  // APPLICANT PERMISSIONS
  // =====================================================

  await assignPermissions("APPLICANT", [
    "beasiswa.read",
    "pendaftaran.read",
    "pendaftaran.create",
    "pendaftaran.update",
    "pendaftaran.submit"
  ]);

  // =====================================================
  // VERIFIKATOR PERMISSIONS
  // =====================================================

  await assignPermissions("VERIFIKATOR", [
    "beasiswa.read",
    "pendaftaran.read",
    "verifikasi.read",
    "verifikasi.update",
    "dokumen.read"
  ]);

  // =====================================================
  // LEMBAGA SELEKSI PERMISSIONS
  // =====================================================

  await assignPermissions("LEMBAGA SELEKSI", [
    "beasiswa.read",
    "pendaftaran.read",
    "wawancara.read",
    "wawancara.update",
    "dokumen.read"
  ]);

  // =====================================================
  // CREATE INTERNAL USER HELPER
  // =====================================================

  async function createInternalUser({
    username,
    email,
    password,
    roleName
  }) {
    const role = await getRole(roleName);

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const user = await prisma.user.upsert({
      where: {
        username
      },
      update: {
        email,
        passwordHash,
        isActive: true
      },
      create: {
        username,
        email,
        passwordHash,
        isActive: true
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id
      }
    });

    console.log(
      `✅ User ${username} created/updated with role ${roleName}`
    );

    return user;
  }

  // =====================================================
  // CREATE ADMIN USER
  // =====================================================

  await createInternalUser({
    username: "admin",
    email: "admin@beasiswa.local",
    password: "Admin123!",
    roleName: "ADMIN"
  });

  // =====================================================
  // CREATE VERIFIKATOR USER
  // =====================================================

  await createInternalUser({
    username: "verifikator",
    email: "verifikator@beasiswa.local",
    password: "Verifikator123!",
    roleName: "VERIFIKATOR"
  });

  // =====================================================
  // CREATE LEMBAGA SELEKSI USER
  // =====================================================

  await createInternalUser({
    username: "lembaga_seleksi",
    email: "lembaga@beasiswa.local",
    password: "Lembaga123!",
    roleName: "LEMBAGA SELEKSI"
  });

    // =====================================================
  // CREATE SYSTEM MENUS
  // =====================================================

  const menus = [
    {
      name: "Dashboard",
      route: "/internal/admin",
      icon: "bi-speedometer2",
      parentId: null,
      sortOrder: 1,
      isActive: true
    },
    {
      name: "Hasil Seleksi",
      route: "/internal/admin?menu=hasil",
      icon: "bi-check2-square",
      parentId: null,
      sortOrder: 2,
      isActive: true
    },
    {
      name: "Data Master",
      route: "/internal/admin?menu=master",
      icon: "bi-database",
      parentId: null,
      sortOrder: 3,
      isActive: true
    },
    {
      name: "Setting System",
      route: null,
      icon: "bi-gear",
      parentId: null,
      sortOrder: 4,
      isActive: true
    }
  ];

  const menuRecords = [];

  for (const menuData of menus) {
    const menu = await prisma.menu.upsert({
      where: {
        id: menuData.name === "Dashboard"
          ? 1
          : menuData.name === "Hasil Seleksi"
            ? 2
            : menuData.name === "Data Master"
              ? 3
              : 4
      },
      update: {
        name: menuData.name,
        route: menuData.route,
        icon: menuData.icon,
        sortOrder: menuData.sortOrder,
        isActive: menuData.isActive
      },
      create: menuData
    });

    menuRecords.push(menu);
  }

  const settingSystem = menuRecords.find(
    (menu) => menu.name === "Setting System"
  );

  // =====================================================
  // CREATE SETTING SYSTEM CHILD MENUS
  // =====================================================

  const settingMenus = [
    {
      name: "Users Internal",
      route: "/internal/admin?menu=users",
      icon: "bi-people",
      parentId: settingSystem.id,
      sortOrder: 1,
      isActive: true
    },
    {
      name: "Role & Akses Menu",
      route: "/internal/admin?menu=roles",
      icon: "bi-shield-lock",
      parentId: settingSystem.id,
      sortOrder: 2,
      isActive: true
    },
    {
      name: "Menu System",
      route: "/internal/admin?menu=menus",
      icon: "bi-list",
      parentId: settingSystem.id,
      sortOrder: 3,
      isActive: true
    }
  ];

  for (const menuData of settingMenus) {
    const existingMenu = await prisma.menu.findFirst({
      where: {
        name: menuData.name,
        parentId: settingSystem.id
      }
    });

    let menu;

    if (existingMenu) {
      menu = await prisma.menu.update({
        where: {
          id: existingMenu.id
        },
        data: {
          route: menuData.route,
          icon: menuData.icon,
          sortOrder: menuData.sortOrder,
          isActive: menuData.isActive
        }
      });
    } else {
      menu = await prisma.menu.create({
        data: menuData
      });
    }

    menuRecords.push(menu);
  }

  console.log(
    `✅ ${menuRecords.length} system menus created/updated`
  );

  // =====================================================
  // ADMIN GETS ALL MENUS
  // =====================================================

  for (const menu of menuRecords) {
    await prisma.roleMenu.upsert({
      where: {
        roleId_menuId: {
          roleId: adminRole.id,
          menuId: menu.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        menuId: menu.id
      }
    });
  }

  console.log(
    "✅ ADMIN menu access assigned"
  );

  // =====================================================
  // FINISHED
  // =====================================================

  console.log("");
  console.log("========================================");
  console.log("🎉 RBAC SEED COMPLETED");
  console.log("========================================");
  console.log("");

  console.log("Internal users:");
  console.log("");

  console.log("ADMIN");
  console.log("Username: admin");
  console.log("Password: Admin123!");
  console.log("");

  console.log("VERIFIKATOR");
  console.log("Username: verifikator");
  console.log("Password: Verifikator123!");
  console.log("");

  console.log("LEMBAGA SELEKSI");
  console.log("Username: lembaga_seleksi");
  console.log("Password: Lembaga123!");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });