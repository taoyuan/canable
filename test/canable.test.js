'use strict';

/* global describe,it,beforeEach,afterEach */
const assert = require('chai').assert;
const Canable = require('..');

const s = require('./support');

describe('canable', () => {
	describe('with dirty', () => {
		itCanable(true);
	});

	describe('without dirty', () => {
		itCanable(false);
	});
});

function itCanable(dirty) {
	let canable;
	let product;

	beforeEach(() => s.setup());

	beforeEach(() => {
		canable = new Canable({ds: s.ds, dirty});
		return s.Product.create().then(p => product = p);
	});

	afterEach(() => s.teardown());

	function getPermissions(target) {
		return target._permissions || target.permissions;
	}

	it('should allow single action', () => {
		return canable.allow('tom', product, 'read').then(p => {
			assert.sameDeepMembers(getPermissions(p || product), [{subject: 'tom', actions: ['read']}]);
		});
	});

	it('should allow multiple actions', () => {
		return canable.allow('tom', product, ['read', 'destroy']).then(p => {
			assert.sameDeepMembers(getPermissions(p || product), [{subject: 'tom', actions: ['read', 'destroy']}]);
		});
	});

	it('should allow multiple subjects', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(p => {
			assert.sameDeepMembers(getPermissions(p || product), [
				{subject: 'a', actions: ['read', 'destroy']},
				{subject: 'b', actions: ['read', 'destroy']}
			]);
		});
	});

	it('should disallow action', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			return canable.disallow(['a', 'b'], product, ['destroy']).then(p => {
				assert.sameDeepMembers(getPermissions(p || product), [{subject: 'a', actions: ['read']}, {
					subject: 'b',
					actions: ['read']
				}]);
			});
		});
	});

	it('should can for all without permissions set', () => {
		assert.eventually.isTrue(canable.can('a', product, 'read'));
	});

	it('should can for all with empty permissions', () => {
		return canable.allow(['a', 'b'], product, []).then(() => {
			assert.eventually.isTrue(canable.can('a', product, 'read'));
		});
	});

	it('should can for all with `*` action permitted', () => {
		return canable.allow(['a', 'b'], product, '*').then(() => {
			assert.eventually.isTrue(canable.can('a', product, 'read'));
		});
	});

	it('should can for all with `all` action permitted', () => {
		return canable.allow(['a', 'b'], product, 'all').then(() => {
			assert.eventually.isTrue(canable.can('a', product, 'read'));
		});
	});

	it('should can for single permitted action', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isTrue(canable.can('a', product, 'read'));
		});
	});

	it('should can for multiple permitted actions', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isTrue(canable.can('a', product, ['read', 'destroy']));
		});
	});

	it('should `can` not for single un-permitted action', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(canable.can('a', product, ['manage']));
		});
	});

	it('should `can` not for multiple un-permitted action', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(canable.can('a', product, ['read', 'manage']));
		});
	});

	it('should `can` not for single un-permitted subject', () => {
		return canable.allow(['a', 'b'], product, ['read', 'destroy']).then(() => {
			assert.eventually.isFalse(canable.can('c', product, ['read']));
		});
	});

	it('should work for string entity', () => {
		return canable.allow('tom', 'Product', 'read').then(() => {
			return canable.models.CanEntity.findOne({entityType: 'Product'}).then(inst => {
				assert.sameDeepMembers(inst.permissions, [{subject: 'tom', actions: ['read']}]);
			});
		});
	});
}
