function validNewPassword(password) {
  return typeof password === "string" && [...password].length >= 12 && Buffer.byteLength(password, "utf8") <= 72;
}

const PASSWORD_REQUIREMENTS = "Şifrə ən azı 12 simvol və ən çox 72 UTF-8 bayt olmalıdır.";

module.exports = { validNewPassword, PASSWORD_REQUIREMENTS };
