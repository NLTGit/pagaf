# Precision Ag for the American Farmer

By [New Light Technologies](https://newlighttechnologies.com/) for the [Census Opportunity Project](https://newlighttechnologies.com/)

- https://pagaf.nltmso.com
- [About](https://github.com/NLTGit/pagaf/wiki)


## One-time dev setup

[Create yourself an Auth0 tenant and some AWS resources](https://github.com/NLTGit/pagaf/wiki/Auth0-and-Amazon-setup). Make a `site/config.json` that includes the parameters pointing to those resources.

Then you should be able to host a dev instance on localhost with any old Web Server, for example:

```
cd site
python -m http.server
```


## Deploying code changes

We'll later do this with Terraform, but for now, after creating the appropriate [config.json](https://github.com/NLTGit/pagaf/wiki/Auth0-and-Amazon-setup) in the site directory:

```
aws s3 sync site s3://pagaf.nltmso.com
```


## Legal

Copyright (C) 2020 New Light Technologies

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
