const yaml = require("js-yaml");
const mtif = require("mtif");

module.exports = (eleventyConfig) => {
  eleventyConfig.addDataExtension("yaml", (contents) =>
    yaml.safeLoad(contents)
  );
};
