const _ = require('lodash');
const PromiseA = require('bluebird');
const arrify = require('arrify');
const joi = require('joi');
const schemas = require('./schemas');
const secure = require('./secure');
const util = require('util');

const DEFAULT_PERMISSIONS_PROPERTY = '_permissions';

class Canable {

	constructor(opts) {
		this.opts = _.defaults(opts, {
			property: DEFAULT_PERMISSIONS_PROPERTY
		});

		this.findCorrelatedSubjectsFn = opts.findCorrelatedSubjects || _.noop;
		this.dirty = opts.dirty !== false;
		this.property = opts.property || DEFAULT_PERMISSIONS_PROPERTY;
		this.models = require('./models')(opts);
	}

	findCorrelatedSubjects(subject) {
		return this.findCorrelatedSubjectsFn(subject);
	}

	allow(subjects, entities, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entities, schemas.Entities);
		joi.assert(actions, schemas.Actions);

		const isArray = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {CanEntity} = this.models;
		const {dirty, property} = this;

		return PromiseA.map(entities, entity => {
			if (!entity) return;
			if (!dirty || _.isString(entity)) {
				let entityType = entity;
				let entityId = '';
				if (!_.isString(entity)) {
					if (!(_.isObject(entity) && entity.id && entity.constructor.modelName)) {
						throw new Error(util.format('Invalid entity (should be loopback dao object): %j', entity));
					}
					entityType = entity.constructor.modelName;
					entityId = entity.id;
				}

				const data = {entityType, entityId};
				return CanEntity.findOrCreate({where: data}, data).then(([inst]) => allow(inst, 'permissions'));
			}
			return allow(entity, property);
		}).then(items => isArray ? items : items[0]);

		function allow(target, key) {
			const permissions = target[key] || [];
			_.forEach(subjects, subject => {
				if (!subject) return;
				let permission = _.find(permissions, p => p.subject === subject);
				if (!permission) {
					permission = {subject};
					permissions.push(permission);
				}
				permission.actions = _.union(permission.actions || [], actions);
			});
			target[key] = permissions;
			return saveEntity(target);
		}
	}

	disallow(subjects, entities, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entities, schemas.Entities);
		joi.assert(actions, schemas.Actions);

		const isArray = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {CanEntity} = this.models;
		const {dirty, property} = this;

		return PromiseA.map(entities, entity => {
			if (!entity) return;
			if (!dirty || _.isString(entity)) {
				let entityType = entity;
				let entityId = '';
				if (!_.isString(entity)) {
					if (!(_.isObject(entity) && entity.id && entity.constructor.modelName)) {
						throw new Error(util.format('Invalid entity: %j', entity));
					}
					entityType = entity.constructor.modelName;
					entityId = entity.id;
				}

				const data = {entityType, entityId};
				return CanEntity.findOne({where: data}).then(inst => {
					if (inst) return disallow(inst, 'permissions');
				});
			}
			return disallow(entity, property);
		}).then(items => isArray ? items : items[0]);

		function disallow(target, key) {
			if (!target[key]) return;
			const permissions = target[key];
			_.forEach(subjects, subject => {
				if (!subject) return;
				const permission = _.find(permissions, p => p.subject === subject);
				if (!permission) return;
				if (!_.isEmpty(permission.actions)) {
					permission.actions = _.without(permission.actions, ...actions);
				}
				if (_.isEmpty(permission.actions)) {
					_.remove(permissions, p => p.subject === subject);
				}
				if (_.isEmpty(permissions)) {
					target[key] = null;
				}
			});
			return saveEntity(target);
		}
	}

	can(subjects, entity, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entity, schemas.Entity);
		joi.assert(actions, schemas.Actions);
		return PromiseA.map(arrify(subjects), subject => _.union([subject], arrify(this.findCorrelatedSubjects(subject))))
			.then(_.flatten).then(subjects => this._can(subjects, entity, actions));
	}

	_can(subjects, entity, actions) {
		subjects = _.uniq(arrify(subjects));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects)) {
			return PromiseA.resolve(false);
		}
		if (!entity || _.isEmpty(actions)) {
			return PromiseA.resolve(true);
		}

		const {CanEntity} = this.models;
		const {dirty, property} = this;

		if (!dirty || _.isString(entity)) {
			let entityType = entity;
			let entityId = '';
			if (!_.isString(entity)) {
				if (!(_.isObject(entity) && entity.id && entity.constructor.modelName)) {
					throw new Error(util.format('Invalid entity: %j', entity));
				}
				entityType = entity.constructor.modelName;
				entityId = entity.id;
			}

			const data = {entityType, entityId};
			return CanEntity.findOne({where: data}).then(inst => {
				if (!inst) return true;
				return can(inst, 'permissions');
			});
		}

		return PromiseA.resolve(can(entity, property));

		function can(target, key) {
			const permissions = target[key];
			if (_.isEmpty(permissions)) {
				return true;
			}

			return Boolean(_.find(subjects, subject => {
				const permission = _.find(permissions, p => p.subject === subject);
				if (!permission) {
					return false;
				}
				if (_.find(permission.actions, action => action === '*' || action === 'all')) {
					return true;
				}
				actions = actions.filter(action => !_.includes(permission.actions, action));
				return !actions.length;
			}));
		}
	}

	cannot(subjects, entity, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entity, schemas.Entity);
		joi.assert(actions, schemas.Actions);
		return this.can(...arguments).then(allowed => !allowed);
	}

	secure(Model, opts) {
		opts = _.defaults(opts || {}, this.opts);
		return secure(Model, opts);
	}
}

module.exports = Canable;

function saveEntity(entity) {
	if (!_.isFunction(entity.save)) {
		return entity;
	}

	if (entity.save.length > 0) {
		return PromiseA.fromCallback(cb => entity.save(cb));
	}
	return entity.save();
}

