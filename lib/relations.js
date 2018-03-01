const isObject = object => (object.toString() === '[object Object]');

const has = function has(type, targetModel, config = {}, ...rest) {
  const defaultConfig = {
    foreignField: 'id', localField: 'id', using: 'query', params: {}, fetchMode: 'combined',
  };
  const settings = Object.assign(
    { targetModel, type }, defaultConfig,
    isObject(config) ? config : {},
  );

  if (typeof config === 'string') { // keep backward compatibility
    settings.foreignField = config;
    const localField = (!!rest[0] && rest[0]);
    settings.localField = localField || settings.localField;
  }
  return settings;
};

module.exports.hasOne = has.bind(null, 'one');
module.exports.hasMany = has.bind(null, 'many');
