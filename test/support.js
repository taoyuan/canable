'use strict';

require('chai').use(require('chai-as-promised'));
const _ = require('lodash');
const PromiseA = require('bluebird');
const DataSource = require('loopback-datasource-juggler').DataSource;

let gid = 1;
const ds = exports.ds = new DataSource('memory');

function nextId() {
	return gid++;
}

function cleanup(ds) {
	return PromiseA.map(_.values(ds.models), model => model.dataSource && model.destroyAll());
}

exports.setup = function () {
	return cleanup(ds);
};

exports.teardown = function () {
	return cleanup(ds);
};


class Product {
	constructor() {
		this.id = nextId();
	}
}
Product.modelName = 'Product';

exports.Product = Product;

