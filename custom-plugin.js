const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withCustomKotlinConfig(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const kotlinConfig = `
          tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
              kotlinOptions {
                  freeCompilerArgs += "-Xopt-in=kotlin.ExperimentalStdlibApi"
              }
          }
      `;
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{/,
        `allprojects {${kotlinConfig}`
      );
    }
    return config;
  });
};