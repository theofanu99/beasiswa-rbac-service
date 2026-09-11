const prisma = require("../lib/prisma");

async function getPermissions(req, res, next) {
  try {
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        id: "asc"
      }
    });

    return res.json({
      data: permissions
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPermissions
};