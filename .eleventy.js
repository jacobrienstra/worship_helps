const pluginSass = require("eleventy-plugin-sass");
const moment = require("moment");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(pluginSass);

  dir: {
    input: ["posts", "."];
  }
};
