# Requirements

**Use Exact Versions**

* Sencha architect 4.2.1 Build: 224
* Ext CMD v 6.5.0.180
* Set publish / build folder outside the git repo

## Deployment steps

* Build web app to an external folder from the repo
* Copy only changed files such as the ones below and move them to the ./site folder. **Do not bulk replace resources folder contents**
	* app.js
	* app.json
	* app.jsonp
	* **NEVER copy the index.html file** doing so will break the application.
* Changes required to javascript outside of Sencha must be done to each file outside the application. 
	* Examples would be html files like index, home, login
	* Javascript files in the ./js folder etc. 
* Upload all files to the S3 bucket. Do not delete any folders not found in the repo from the S3 bucket or tile map service could be affected. 
