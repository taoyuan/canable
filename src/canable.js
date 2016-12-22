const _ = require('lodash');
const PromiseA = require('bluebird');
const arrify = require('arrify');
const joi = require('joi');
const util = require('util');
const schemas = require('./schemas');
const secure = require('./secure');
const modeler = require('./modeler');

const DEFAULT_PERMISSIONS_PROPERTY = '_permissions';

class Canable {

	/**
	 * Constructor for Canable
	 *
	 * @param {String|Object} [ds]
	 * @param {Object} [opts]
	 * @param {Boolean} [opts.dirty] is dirty mode. Default is true.
	 * @param {String} [opts.property] property name for dirty mode. Default is "_permission".
	 * @param {Function} [opts.findCorrelatedSubjects] find correlated roles for the subject (user or role).
	 * @param {Function} [opts.getCurrentSubjects] get current user and roles correlated.
	 * @param {Object|String} [opts.dataSource]
	 * @param {Object|String} [opts.datasource]
	 * @param {Object|String} [opts.ds]
	 *
	 */
	constructor(ds, opts) {
		if (!_.isString(ds) && !_.isFunction(_.get(ds, 'createModel'))) {
			opts = ds;
			ds = undefined;
		}

		this.opts = _.defaults(opts, {
			ds,
			property: DEFAULT_PERMISSIONS_PROPERTY
		});
		opts.dirty = opts.dirty !== false;
		opts.property = opts.property || DEFAULT_PERMISSIONS_PROPERTY;

		this.findCorrelatedSubjectsFn = opts.findCorrelatedSubjects || _.noop;
		this._models = modeler.load(opts);
	}

	get models() {
		return this._models;
	}

	findCorrelatedSubjects(subject) {
		return this.findCorrelatedSubjectsFn(subject);
	}

	allow(subjects, entities, actions) {
		joi.assert(subjects, schemas.Subjects);
		joi.assert(entities, schemas.Entities);
		joi.assert(actions, schemas.Actions);

		const multiple = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {SecEntity} = this._models;
		const {dirty, property} = this.opts;

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
				return SecEntity.findOrCreate({where: data}, data).then(([inst]) => allow(inst, 'permissions'));
			}
			return allow(entity, property);
		}).then(items => multiple ? items : items[0]);

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
		if (_.isNil(actions) || actions === '*' || actions === 'all') {
			actions = '*';
		} else {
			joi.assert(actions, schemas.Actions);
			actions = _.uniq(arrify(actions));
		}

		const multiple = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {SecEntity} = this._models;
		const {dirty, property} = this.opts;

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
				return SecEntity.findOne({where: data}).then(inst => {
					if (inst) return disallow(inst, 'permissions');
				});
			}
			return disallow(entity, property);
		}).then(items => multiple ? items : items[0]);

		function disallow(target, key) {
			if (!target[key]) return;
			const permissions = target[key];
			_.forEach(subjects, subject => {
				if (!subject) return;
				const permission = _.find(permissions, p => p.subject === subject);
				if (!permission) return;
				if (!_.isEmpty(permission.actions)) {
					permission.actions = actions === '*' ? null : _.without(permission.actions, ...actions);
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

	remove(entities) {
		const multiple = Array.isArray(entities);
		joi.assert(entities, schemas.Entities);

		entities = _.uniq(arrify(entities));
		const {SecEntity} = this._models;
		const {dirty, property} = this.opts;

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
				return SecEntity.destroyAll(data);
			}

			// dirty mode
			entity[property] = null;
			return saveEntity(entity);
		}).then(items => multiple ? items : items[0]);
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

		const {SecEntity} = this._models;
		const {dirty, property} = this.opts;

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
			return SecEntity.findOne({where: data}).then(inst => {
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

	/**
	 * Secure a model class for find
	 *
	 * @param {Function} Model model class to secure
	 * @param {Object} [opts] options for secure. Default is provided in constructor.
	 */
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

