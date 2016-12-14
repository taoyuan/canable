const _ = require('lodash');
const PromiseA = require('bluebird');
const arrify = require('arrify');
const joi = require('joi');
const schemas = require('./schemas');
const Permissions = require('./permissions');

class Canable {

	constructor(opts) {
		opts = opts || {};
		this._findCorrelatedSubjects = opts.findCorrelatedSubjects || _.noop;
		this._models = require('./models')(opts);
		this._permissions = new Permissions(this._models, opts);
	}
	// TODO support string type entities for Model Class permissions
	allow(subjects, entities, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entities, schemas.Entities);
		joi.assert(actions, schemas.Actions);
		return this._permissions.allow(subjects, entities, actions);
	}

	disallow(subjects, entities, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entities, schemas.Entities);
		joi.assert(actions, schemas.Actions);
		return this._permissions.disallow(subjects, entities, actions);
	}

	can(subjects, entity, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entity, schemas.Entity);
		joi.assert(actions, schemas.Actions);
		return PromiseA.map(arrify(subjects), subject => [subject].concat(arrify(this._findCorrelatedSubjects(subject))))
			.map(_.flatten)
			.then(subjects => this._permissions.can(subjects, entity, actions));
	}

	cannot(subjects, entity, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entity, schemas.Entity);
		joi.assert(actions, schemas.Actions);
		return this.can(...arguments).then(allowed => !allowed);
	}
}

module.exports = Canable;
