var request = require("request-promise");
const cheerio = require("cheerio");

module.exports = {
  provider: "DosyaTC",
  name: "DosyaTC",
  auth: {
    debug: {
      label: "Debug",
      type: "enum",
      values: ["true", "false"]
    }
  },
  init: config => {
    return {
      upload(file) {
        return new Promise((resolve, reject) => {
          config.debug && console.log("[ Dosya.Tc ] Started");
          request({
            method: "POST",
            url: "https://www.dosya.tc/u_link_upload.php",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            form: { "upload_file[]": file.name }
          })
            .then(result => {
              config.debug && console.log("[ Dosya.Tc ] ID Resolved");
              return /(["])(?:(?=(\\?))\2.)*?\1/g
                .exec(result)[0]
                .replace(/"/g, "");
            })
            .then(uploadId => {
              config.debug && console.log("[ Dosya.Tc ] Uploading");
              request({
                method: "POST",
                url:
                  "https://www.dosya.tc/cgi-bin/u_upload.pl?upload_id=" +
                  uploadId,
                formData: {
                  filename: {
                    value: file.buffer,
                    options: {
                      filename: file.name,
                      contentType: null
                    }
                  }
                }
              }).then(() => {
                request({
                  method: "GET",
                  url:
                    "https://www.dosya.tc/u_finished.php?upload_id=" + uploadId
                }).then(result => {
                  const $ = cheerio.load(result);
                  let deleteLink = $("a")
                    .eq(9)
                    .attr("href");
                  request({
                    method: "GET",
                    url: $("a")
                      .eq(6)
                      .attr("href")
                  })
                    .then(result => {
                      const $ = cheerio.load(result);
                      const regex = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%.]+/g;
                      let lastResult = regex
                        .exec(
                          $("script")[2].children[0].data.replace(/\n/g, "")
                        )
                        .input.replace(
                          'function myFunction() {if(window.top == window.self){window.open("http://www.greatdexchange.com/jump/next.php?r=81231");window.open("',
                          ""
                        )
                        .replace(/","_self".+/g, "");
                      config.debug && console.log("[ Dosya.Tc ] Uploaded");
                      config.debug &&
                        console.log(
                          "\n[ Dosya.Tc ] Download URL: " + lastResult
                        );
                      config.debug &&
                        console.log("[ Dosya.Tc ] Delete URL: " + deleteLink);
                      file.public_id = deleteLink;
                      file.url = lastResult;
                      file.name = file.name;
                      // return resolve()
                    })
                    .then(() => {
                      return resolve();
                    });
                });
              });
            })
            .catch(error => {
              console.log(error);
            });
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          request({
            method: "GET",
            url: file.public_id
          }).then(result => {
            config.debug == "true"
              ? console.log("[ Dosya.Tc ] " + file.name + " removed")
              : null;
            return resolve();
          });
        });
      }
    };
  }
};
