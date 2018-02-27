const has = (type, targetModel, foreignKey = 'id', localKey = 'id') => ({
  type,
  foreignKey,
  localKey,
  targetModel
});
module.exports.hasOne = has.bind(null, 'one');
module.exports.hasMany = has.bind(null, 'many');
