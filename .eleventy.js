const pluginSass = require("eleventy-plugin-sass");
const moment = require("moment");
const lodash = require("lodash");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(pluginSass);
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("_redirects");
  eleventyConfig.addPassthroughCopy({ "posts/**/*.png": "img" });
  eleventyConfig.addCollection("archive", function (collection) {
    let monthMap = {};
    collection.getAllSorted().map(function (item) {
      if ("date" in item.data) {
        let date = moment(item.data.date);
        let dateStr = date.format("MMMM YYYY");
        if (dateStr in monthMap) {
          monthMap[dateStr].items.push(item);
        } else {
          monthMap[dateStr] = { date: date, items: [item] };
        }
      }
    });
    monthList = [];
    for (let month of Object.keys(monthMap)) {
      monthList.push({
        name: month,
        m: moment(monthMap[month].date).format("MM"),
        y: moment(monthMap[month].date).format("YYYY"),
        items: monthMap[month].items,
      });
    }
    return monthList.reverse();
  });

  eleventyConfig.addCollection("doublePagination", function (collection) {
    // Get unique list of tags
    let tagSet = new Set();
    collection.getAllSorted().map(function (item) {
      if ("tags" in item.data) {
        let tags = item.data.tags;

        for (let tag of tags) {
          tagSet.add(tag);
        }
      }
    });

    // Get each item that matches the tag
    let paginationSize = 10;
    let tagMap = [];
    let tagArray = [...tagSet];
    for (let tagName of tagArray) {
      let tagItems = collection.getFilteredByTag(tagName);
      let pagedItems = lodash.chunk(tagItems, paginationSize);
      // console.log( tagName, tagItems.length, pagedItems.length );
      for (
        let pageNumber = 0, max = pagedItems.length;
        pageNumber < max;
        pageNumber++
      ) {
        tagMap.push({
          tagName: tagName,
          pageNumber: pageNumber,
          pageData: pagedItems[pageNumber],
        });
      }
    }

    /* return data looks like:
		[{
			tagName: "tag1",
			pageNumber: 0
			pageData: [] // array of items
		},{
			tagName: "tag1",
			pageNumber: 1
			pageData: [] // array of items
		},{
			tagName: "tag1",
			pageNumber: 2
			pageData: [] // array of items
		},{
			tagName: "tag2",
			pageNumber: 0
			pageData: [] // array of items
		}]
	 */
    //console.log( tagMap );
    return tagMap;
  });

  // TODO: add collection of categories with urlized?

  dir: {
    input: ["posts", "."];
  }
  eleventyConfig.setQuietMode(true);
};
