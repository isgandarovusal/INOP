// Conservative AZ/EN/RU exclusion; not contextual inference or qualification.
const adverseLiteral = /(?<![\p{L}\p{N}_])(?:no|not|without|lacks|unknown|unverified|(?:doesn|isn|aren|hasn|haven|hadn|wasn|weren|can|couldn|wouldn|shouldn|didn|don|won)['’]t|yox|yoxdur|deyi\u0307?l|нет|не|без|отсутствует|неизвестно|неподтверждено)(?![\p{L}\p{N}_])/u;
module.exports = adverseLiteral;
