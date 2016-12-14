'use strict';

const _ = require('lodash');
const DataSource = require('loopback-datasource-juggler').DataSource;

const MODELS = {
	CanPermission: 'can-permission'
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
	models.CanPermission = createModel(dataSource, MODELS.CanPermission);
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
	return ds.createModel(def.name, def.properties, getSettings(def));
}

function extendModel(Model, filename) {
	const extend = require(`./models/${filename}.json`);
	if (_.isFunction(extend)) {
		extend(Model);
	}
}

function getSettings(def) {
	const settings = {};
	for (let s in def) {
		if (s === 'name' || s === 'properties') {
			continue;
		} else {
			settings[s] = def[s];
		}
	}
	return settings;
}
