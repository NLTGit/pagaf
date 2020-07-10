# Precision Ag for the American Farmer

By [New Light Technologies](https://newlighttechnologies.com/) for the [Census Opportunity Project](https://newlighttechnologies.com/)


## One-time dev setup

You should already have Python 3 and the AWS command-line tool.

It's a good idea to use virtualenv, this assumes you'll install the virtualenv somewhere outside your git working directory:

```
git clone git@github.com:NLTGit/pagaf.git
python -m venv venv-pagaf
.\venv-pagaf\Scripts\activate
pip install -r pagaf/requirements.txt
```


## Deploy


To create an instance of the app, use the `stack.py` script, replacing `my-pagaf` with a name that is meaningful to you:

```
python stack.py --stack-name my-pagaf create
```

After making changes, update thus:

```
python stack.py --stack-name my-pagaf update
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
