const authService = require("../services/auth-services");

async function register(req, res, next) {
  try {
    const {
      nik,
      namaLengkap,
      email
    } = req.body;

    const user =
      await authService.registerApplicant({
        nik,
        namaLengkap,
        email
      });

    return res.status(201).json({
      message:
        "Registrasi berhasil. Kredensial login telah dikirim ke email Anda.",

      data: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const {
      username,
      password
    } = req.body;

    if (
      !String(username || "").trim() ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Username/email dan password wajib diisi"
      });
    }

    const result = await authService.login(
      username,
      password
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie(
      "refreshToken",
      result.refreshToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",

        maxAge:
          Number(
            process.env
              .REFRESH_TOKEN_EXPIRES_DAYS || 7
          ) *
          24 *
          60 *
          60 *
          1000,

        path: "/api/auth"
      }
    );

    return res.json({
      message: "Login berhasil",
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    const result =
      await authService.refresh(
        refreshToken
      );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie(
      "refreshToken",
      result.refreshToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",

        maxAge:
          Number(
            process.env
              .REFRESH_TOKEN_EXPIRES_DAYS || 7
          ) *
          24 *
          60 *
          60 *
          1000,

        path: "/api/auth"
      }
    );

    return res.json({
      message:
        "Token berhasil diperbarui",
      accessToken: result.accessToken
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    await authService.logout(
      refreshToken
    );

    res.clearCookie(
      "refreshToken",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/api/auth"
      }
    );

    return res.json({
      message: "Logout berhasil"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout
};