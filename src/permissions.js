'use strict';

const _ = require('lodash');
const PromiseA = require('bluebird');
const arrify = require('arrify');
const util = require('util');

const DEFAULT_DIRTY_PROP = '_permissions';

class Permissions {
	constructor(models, opts) {
		opts = opts || {};
		this._models = models;

		if (opts.dirty !== false) {
			if (opts.dirty) {
				this._property = _.isString(opts.dirty) ? opts.dirty : DEFAULT_DIRTY_PROP;
			} else {
				this._property = DEFAULT_DIRTY_PROP;
			}
		}
	}

	allow(subjects, entities, actions) {
		const isArray = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {CanPermission} = this._models;
		const prop = this._property;

		return PromiseA.map(entities, entity => {
			if (!entity) return;
			if (!prop || _.isString(entity)) {
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
				return CanPermission.findOrCreate({where: data}, data).then(([inst]) => allow(inst, 'actions'));
			}
			return allow(entity, prop);
		}).then(items => isArray ? items : items[0]);

		function allow(target, key) {
			const permissions = target[key] = target[key] || {};
			_.forEach(subjects, subject => {
				if (!subject) return;
				permissions[subject] = permissions[subject] || [];
				permissions[subject] = _.union(permissions[subject], actions);
			});
			return saveEntity(target);
		}
	}

	disallow(subjects, entities, actions) {
		const isArray = Array.isArray(entities);
		subjects = _.uniq(arrify(subjects));
		entities = _.uniq(arrify(entities));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects) ||
			_.isEmpty(entities) ||
			_.isEmpty(actions)) {
			return PromiseA.resolve();
		}

		const {CanPermission} = this._models;
		const prop = this._property;

		return PromiseA.map(entities, entity => {
			if (!entity) return;
			if (!prop || _.isString(entity)) {
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
				return CanPermission.findOne({where: data}).then(inst => {
					if (inst) return disallow(inst, 'actions');
				});
			}
			return disallow(entity, prop);
		}).then(items => isArray ? items : items[0]);

		function disallow(target, key) {
			if (!target[key]) return;
			const permissions = target[key];
			_.forEach(subjects, subject => {
				if (!subject || _.isEmpty(permissions[subject])) return;
				permissions[subject] = _.without(permissions[subject], ...actions);
				if (_.isEmpty(permissions[subject])) {
					_.unset(permissions, subject);
				}
			});
			return saveEntity(target);
		}
	}

	can(subjects, entity, actions) {
		subjects = _.uniq(arrify(subjects));
		actions = _.uniq(arrify(actions));

		if (_.isEmpty(subjects)) {
			return PromiseA.resolve(false);
		}
		if (!entity || _.isEmpty(actions)) {
			return PromiseA.resolve(true);
		}

		const {CanPermission} = this._models;
		const prop = this._property;

		if (!prop || _.isString(entity)) {
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
			return CanPermission.findOne({where: data}).then(inst => {
				if (!inst) return true;
				return can(inst, 'actions');
			});
		}

		return PromiseA.resolve(can(entity, prop));

		function can(target, key) {
			const permissions = target[key];
			if (_.isEmpty(permissions)) return true;

			return Boolean(_.find(subjects, subject => {
				if (_.find(permissions[subject], p => p === '*' || p === 'all')) {
					return true;
				}
				actions = actions.filter(action => !_.includes(permissions[subject], action));
				return !actions.length;
			}));
		}
	}
}

module.exports = Permissions;

function saveEntity(entity) {
	if (!_.isFunction(entity.save)) {
		return entity;
	}

	if (entity.save.length > 0) {
		return PromiseA.fromCallback(cb => entity.save(cb));
	}
	return entity.save();
}

