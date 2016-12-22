const joi = require('joi');

const strobj = [joi.object(), joi.string()];

const Entity = joi.object({
	save: joi.func().optional()
}).unknown();
exports.Entity = Entity;

const Entities = joi.alternatives().try(Entity, joi.string(), joi.array().items(Entity, joi.string()));
exports.Entities = Entities;

const Subject = joi.alternatives().try(...strobj);
exports.Subject = Subject;
const Subjects = joi.alternatives().try(...strobj, joi.array().items(...strobj));
exports.Subjects = Subjects;

const Action = joi.string();
exports.Action = Action;
const Actions = joi.alternatives().try(Subject, joi.array().items(Action));
exports.Actions = Actions;
