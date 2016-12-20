# nsec-canable

[![NPM version](http://img.shields.io/npm/v/nsec-canable.svg?style=flat-square)](https://www.npmjs.com/package/nsec-canable)
[![NPM downloads](http://img.shields.io/npm/dm/nsec-canable.svg?style=flat-square)](https://www.npmjs.com/package/nsec-canable)
[![Build Status](http://img.shields.io/travis/taoyuan/nsec-canable/master.svg?style=flat-square)](https://travis-ci.org/taoyuan/nsec-canable)
[![Coverage Status](https://img.shields.io/coveralls/taoyuan/nsec-canable.svg?style=flat-square)](https://coveralls.io/taoyuan/nsec-canable)

> An access control library for node.js


## Install

```
$ npm install --save canable
```


## Usage

```js
const Canable = require('canable');

const canable = new Canable();

class User {}
class Product {}

canable.allow(User, 'view', Product);

const user = new User();
const product = new Product();

canable.can(user, 'view', product).then(console.log);
//=> true

canable.can(user, 'edit', product).then(console.log);
//=> false
```

## License

MIT © [Yuan Tao](https://gihub.com/canable)
