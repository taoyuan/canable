'use strict';

const _ = require('lodash');
const DataSource = require('loopback-datasource-juggler').DataSource;

const MODELS = {
	CanEntity: 'can-entity'
};

/**
 *
 * @param options
 * @return {{MODELS}}
 */
module.exports = function (options) {
	options = options || {};

	let dataSource = options.dataSource || options.datasource || options.ds;
	if (dataSource === 'string') {
		dataSource = {connector: dataSource};
	}
	if (!dataSource) {
		dataSource = {connector: 'memory'};
	}
	if (!_.isObject(dataSource) || !_.isFunction(dataSource.createModel)) {
		dataSource = new DataSource(dataSource);
	}

	const models = {};
	// define models
	models.CanEntity = createModel(dataSource, MODELS.CanEntity);
	// extend models
	_.forEach(models, Model => extendModel(dataSource, MODELS[Model.modelName]));
	return models;
};

/**
 *
 * @param ds
 * @param filename
 * @return {Model}
 */
function createModel(ds, filename) {
	const def = require(`./models/${filename}.json`);
	return ds.createModel(def.name, def.properties, _.omit(def, ['name', 'properties']));
}

function extendModel(Model, filename) {
	const extend = require(`./models/${filename}.json`);
	if (_.isFunction(extend)) {
		extend(Model);
	}
}
