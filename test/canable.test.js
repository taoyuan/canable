'use strict';

/* global describe,it,beforeEach,afterEach */
const assert = require('chai').assert;
const Canable = require('..');

const s = require('./support');

describe('canable', () => {
	let canable;

	beforeEach(() => s.setup());

	beforeEach(() => {
		canable = new Canable({ds: s.ds});
	});

	afterEach(() => s.teardown());

	it('should allow', () => {
		const product = new s.Product();
		return canable.allow('tom', product, 'read').then(() => {
			assert.deepEqual(product._permissions, {tom: ['read']});
		});
	});

	it('should disallow', () => {
		const product = new s.Product();
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			return canable.disallow(['a', 'b'], product, ['destroy']).then(() => {
				assert.deepEqual(product._permissions, {a: ['read'], b: ['read']});
			});
		});
	});

	it('should can', () => {
		const product = new s.Product();
		return canable.allow(['a', 'b'], product, ['read']).then(() => {
			return canable.can('a', product, 'read').then(allowed => assert.isTrue(allowed));
		});
	});

	it('should cannot', () => {
		const product = new s.Product();
		return canable.allow(['a', 'b'], product, ['read']).then(() => {
			return canable.cannot('a', product, 'manage').then(allowed => assert.isTrue(allowed));
		});
	});
});
