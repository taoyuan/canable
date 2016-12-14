'use strict';

/* global describe,it */
const assert = require('chai').assert;
const loadModels = require('../src/models');

describe('models', () => {
	it('should load models', () => {
		const models = loadModels();
		assert.ok(models.CanPermission);
		return models.CanPermission.create().then(p => assert.ok(p));
	});
});
