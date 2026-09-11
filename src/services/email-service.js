const nodemailer = require("nodemailer");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getMailConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    throw createHttpError(
      "Layanan email belum dikonfigurasi",
      503
    );
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure:
      String(SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    from: SMTP_FROM || SMTP_USER
  };
}

async function sendApplicantCredentials({
  to,
  namaLengkap,
  username,
  temporaryPassword
}) {
  const config = getMailConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Kredensial Akun Beasiswa Pelatihan",
    text: [
      `Halo ${namaLengkap},`,
      "",
      "Pendaftaran akun Anda berhasil.",
      "",
      `Username: ${username}`,
      `Password sementara: ${temporaryPassword}`,
      "",
      "Silakan login ke Portal Beasiswa Pelatihan menggunakan kredensial tersebut.",
      "",
      "Untuk keamanan, jangan membagikan password kepada siapa pun.",
      "",
      "Portal Aplikasi Pendaftaran Beasiswa Pelatihan"
    ].join("\n")
  });
}

module.exports = {
  sendApplicantCredentials
};