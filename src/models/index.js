// Central model registry — import models from here so refs resolve in one place.
module.exports = {
  User: require('./User'),
  Academy: require('./Academy'),
  AcademyApplication: require('./AcademyApplication'),
  Surah: require('./Surah'),
  Ayah: require('./Ayah'),
  Word: require('./Word'),
  QaidaLesson: require('./QaidaLesson'),
  QaidaPage: require('./QaidaPage'),
  Dua: require('./Dua'),
  Session: require('./Session'),
  GameSession: require('./GameSession'),
};
