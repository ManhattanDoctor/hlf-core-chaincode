**English** · [Русский](./README.ru.md)

# @hlf-core/chaincode

> TypeScript library for developing chaincode in Hyperledger Fabric

[![npm version](https://img.shields.io/npm/v/@hlf-core/chaincode.svg)](https://www.npmjs.com/package/@hlf-core/chaincode)
[![Docs](https://img.shields.io/badge/docs-hlf.gnosisai.ru-1f6feb)](https://hlf.gnosisai.ru/docs/packages/chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Full documentation: https://hlf.gnosisai.ru/docs/packages/chaincode

## Overview

`@hlf-core/chaincode` is a high-level TypeScript library for developing chaincode (smart contracts) in Hyperledger Fabric. It provides abstractions and tools for managing data, entities, and their relationships in the blockchain ledger.

### Key Features

- ** Database management** — working with the Hyperledger Fabric key-value store
- ** Entity management** — an ORM-like API for working with business objects
- ** Entity relationships** — managing parent-child links between objects
- ** Pagination** — efficient handling of large data sets
- ** Validation and transformation** — automatic serialization/deserialization with validation
- ** TypeScript** — full typing and support for modern language features
- ** Dual Package** — support for both CommonJS and ES Modules

## Installation

```bash
npm install @hlf-core/chaincode
```

### Dependencies

The library requires the following packages:

```bash
npm install @hlf-core/common @ts-core/common fabric-shim reflect-metadata
```

`@hlf-core/common` provides `StateKey` — the assembly of state keys on which entity relationships are built.

## Quick Start

### 1. Defining an entity

```typescript
import { IUIDable } from '@ts-core/common';
import { IsString, IsNumber } from 'class-validator';

export class User implements IUIDable {
    @IsString()
    uid: string;

    @IsString()
    name: string;

    @IsNumber()
    age: number;

    @IsString()
    email: string;
}
```

### 2. Creating an entity manager

```typescript
import { EntityManagerImpl } from '@hlf-core/chaincode';
import { ILogger, TransformUtil } from '@ts-core/common';
import { IStub } from '@hlf-core/chaincode';

export class UserManager extends EntityManagerImpl<User> {
    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub);
    }

    // Required method: convert a plain object into a class
    public toEntity(item: any): User {
        return TransformUtil.toClass(User, item);
    }

    // Prefix for storage in the blockchain
    public get prefix(): string {
        return 'user:';
    }

    // Optional: load related data
    public async loadDetails(item: User, details?: Array<keyof User>): Promise<void> {
        // Load additional data if needed
    }
}
```

### 3. Using it in chaincode

```typescript
import { Context } from 'fabric-contract-api';

export class MyContract {
    async createUser(ctx: Context, userId: string, name: string, age: number, email: string): Promise<void> {
        const logger = // your logger
        const stub = // adapter for ctx.stub

        const userManager = new UserManager(logger, stub);

        const user = new User();
        user.uid = userId;
        user.name = name;
        user.age = age;
        user.email = email;

        // Save with automatic validation and serialization
        await userManager.save(user);
    }

    async getUser(ctx: Context, userId: string): Promise<User> {
        const logger = // your logger
        const stub = // adapter for ctx.stub

        const userManager = new UserManager(logger, stub);

        // Retrieve with automatic deserialization and validation
        return await userManager.get(userId);
    }

    async getAllUsers(ctx: Context, pageSize: number, bookmark?: string): Promise<any> {
        const logger = // your logger
        const stub = // adapter for ctx.stub

        const userManager = new UserManager(logger, stub);

        // Retrieve with pagination
        const result = await userManager.findPaginated({
            pageSize,
            pageBookmark: bookmark
        });

        return {
            users: result.items,
            bookmark: result.pageBookmark,
            hasMore: !result.isAllLoaded
        };
    }
}
```

## API Documentation

### DatabaseManager

Base class for working with the key-value store.

#### Methods

##### `getKV(start: string, finish?: string): Promise<Array<IKeyValue>>`

Retrieves all key-value pairs within a range.

```typescript
const kv = await databaseManager.getKV('user:', 'user:￰');
```

##### `getKeys(start: string, finish?: string): Promise<Array<string>>`

Retrieves only the keys within a range.

```typescript
const keys = await databaseManager.getKeys('user:');
```

##### `getValues(start: string, finish?: string): Promise<Array<string>>`

Retrieves only the values within a range.

```typescript
const values = await databaseManager.getValues('user:');
```

##### `getPaginatedKV(request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>>`

Retrieves key-value pairs with pagination.

```typescript
const result = await databaseManager.getPaginatedKV(
    { pageSize: 10, pageBookmark: '' },
    'user:'
);
```

### EntityManager<T>

Abstract class for managing entities. Inherits from `DatabaseManager`.

#### CRUD Methods

##### `get(item: UID, details?: Array<keyof T>): Promise<T>`

Retrieves an entity by ID.

```typescript
const user = await userManager.get('user123');
```

##### `getMany(items: Array<UID>, details?: Array<keyof T>): Promise<Array<T>>`

Retrieves multiple entities by ID.

```typescript
const users = await userManager.getMany(['user1', 'user2', 'user3']);
```

##### `save(item: T): Promise<T>`

Saves an entity (create or update).

```typescript
await userManager.save(user);
```

##### `saveMany(items: Array<T>): Promise<Array<T>>`

Saves multiple entities.

```typescript
await userManager.saveMany([user1, user2, user3]);
```

##### `saveIfNotExists(item: T): Promise<T>`

Saves an entity only if it does not already exist.

```typescript
await userManager.saveIfNotExists(user);
```

##### `has(item: UID): Promise<boolean>`

Checks whether an entity exists.

```typescript
const exists = await userManager.has('user123');
```

##### `remove(item: UID): Promise<void>`

Removes an entity.

```typescript
await userManager.remove('user123');
```

##### `removeMany(items: Array<UID>): Promise<void>`

Removes multiple entities.

```typescript
await userManager.removeMany(['user1', 'user2']);
```

#### Query Methods

Both methods accept a single query object:

```typescript
interface IEntityQuery<U = any, T = any> {
    prefix?: string;                              // where to search; defaults to the manager's prefix
    details?: Array<keyof U>;                     // which related data to load
    transform?: (item: string) => T | Promise<T>; // how to turn a record's value into an entity
}

interface IEntityPageQuery<U = any, T = any> extends IEntityQuery<U, T>, IPageBookmark { }
```

##### `find(query?: IEntityQuery<T>): Promise<Array<T>>`

Finds all entities with the given prefix.

```typescript
const allUsers = await userManager.find();

const withDetails = await userManager.find({ details: ['company'] });

const byPrefix = await userManager.find({ prefix: 'user_2026' });
```

This method reads the entire range at once. In chaincode this means the read set grows linearly with the number of records — for large result sets use `findPaginated`.

##### `findPaginated(query: IEntityPageQuery<T>): Promise<IPaginationBookmark<T>>`

Finds entities page by page.

```typescript
const result = await userManager.findPaginated({
    pageSize: 20,
    pageBookmark: 'bookmark123',
    details: ['company']
});

console.log(result.items);           // Array<User>
console.log(result.pageBookmark);    // Next bookmark
console.log(result.isAllLoaded);     // Whether everything is loaded
```

`IPaginableBookmark` from `@ts-core/common` is structurally compatible with `IEntityPageQuery`, so a list query DTO can be passed directly. Its conditions and sorting are not applied in chaincode — only `pageSize`, `pageBookmark`, and `details` are used.

#### Abstract Methods

When inheriting from `EntityManager` you must implement:

```typescript
// Prefix for keys in the blockchain
abstract get prefix(): string;

// Serialize an entity for storage
protected abstract serialize<V = any>(item: T): Promise<V>;

// Deserialize an entity from storage
protected abstract deserialize(item: any, details?: Array<keyof T>): Promise<T>;

// Load additional data
public abstract loadDetails(item: T, details?: Array<keyof T>): Promise<void>;
```

### EntityManagerImpl<T>

An implementation of `EntityManager` with automatic serialization and validation via `class-validator` and `class-transformer`.

When inheriting you only need to implement:

```typescript
// Convert a plain object into a class
public abstract toEntity(item: any): T;

// Prefix for keys
public abstract get prefix(): string;

// Optional: load related data
public async loadDetails(item: T, details?: Array<keyof T>): Promise<void> {
    // Implementation is optional
}
```

### EntityRelation

Managing relationships between entities.

```typescript
import { EntityRelation } from '@hlf-core/chaincode';

// Create a relation between a post and comments
const relation = new EntityRelation(
    stub,
    'post',      // parent prefix
    'comment'    // child prefix
);

// Add a link
await relation.childLinkAdd('comment123', 'post456');

// Check a link
const hasLink = await relation.childLinkHas('comment123', 'post456');

// Remove a link
await relation.childLinkRemove('comment123', 'post456');

// Remove all links for a child element
await relation.childRemove('comment123');

// Remove a parent and get all child IDs
const childIds = await relation.parentRemove('post456');
```

#### How links are stored

Two keys are written for each link — forward and reverse:

```
→link:post~comment:post456~comment123    → comment123
→link:comment~post:comment123~post456    → post456
```

The forward key serves the retrieval of children by parent: a range query on the prefix `→link:post~comment:post456~` returns all children. The reverse key is needed to remove links knowing only the child — `childRemove` does not require knowing the parent.

Keys are assembled by `StateKey` from `@hlf-core/common`, so key parts are validated and the search prefix always ends with a separator — the parent `post4` will not capture the children of the parent `post45`.

#### Composite parent

A parent can consist of several parts — in that case the search is possible by any left-hand part. This is convenient when a relation is addressed by a pair of values:

```typescript
// linking an order to an account: coin + owner
await relation.childAdd(otcUid, coinUid, ownerUid);

// key: →link:account~otc:<coinUid>~<ownerUid>~<otcUid>

// all orders by coin
relation.childListQuery(coinUid);

// a specific owner's orders for this coin
relation.childListQuery(coinUid, ownerUid);
```

The parts are passed as separate arguments rather than as a concatenated string: a separator inside a value would shift the part boundaries, so such a string is rejected with `StateKeySegmentInvalidError`.

```typescript
await relation.childAdd(otcUid, `${coinUid}~${ownerUid}`);   // error
await relation.childAdd(otcUid, coinUid, ownerUid);          // correct
```

### EntityRelationChild<T, M>

An extension of `EntityRelation` with automatic management of child entities.

```typescript
import { EntityRelationChild } from '@hlf-core/chaincode';

const commentRelation = new EntityRelationChild(
    'post',              // parent prefix
    'comment',           // child prefix
    commentManager       // manager for Comment
);

// Get all comments of a post with pagination
const comments = await commentRelation.childList({ pageSize: 10 }, 'post456');

// Remove a post and all its comments
const deletedCommentIds = await commentRelation.parentRemove('post456');
```

## Architecture

```
┌─────────────────────────────────────────┐
│           IStub Interface               │
│  (Abstraction over fabric-shim)         │
└───────────────┬─────────────────────────┘
                │
                │ uses
                ▼
┌─────────────────────────────────────────┐
│        DatabaseManager                  │
│  • getKV / putKV                        │
│  • getKeys / getValues                  │
│  • getPaginatedKV                       │
└───────────────┬─────────────────────────┘
                │
                │ inherits
                ▼
┌─────────────────────────────────────────┐
│        EntityManager<T>                 │
│  • get / save / remove                  │
│  • find / findPaginated                 │
│  • serialize / deserialize (abstract)   │
└───────────────┬─────────────────────────┘
                │
                │ inherits
                ▼
┌─────────────────────────────────────────┐
│      EntityManagerImpl<T>               │
│  • Automatic serialization              │
│  • Automatic validation                 │
│  • toEntity(item) (abstract)            │
└─────────────────────────────────────────┘
                │
                │ used in
                ▼
        ┌───────────────┐
        │ Your Chaincode│
        └───────────────┘
```

### Entity relationships

```
┌──────────────────────┐
│   EntityRelation     │
│  • Manage relations  │
│  • childAdd/Remove   │
│  • parentRemove      │
└──────────┬───────────┘
           │
           │ inherits
           ▼
┌──────────────────────────────┐
│  EntityRelationChild<T, M>   │
│  • childList (paginated)     │
│  • Cascade deletion          │
└──────────────────────────────┘
```

## Usage Examples

### Example 1: A simple CRUD application

```typescript
import { EntityManagerImpl } from '@hlf-core/chaincode';
import { IsString, IsNumber } from 'class-validator';
import { IUIDable, TransformUtil } from '@ts-core/common';

// Model
class Product implements IUIDable {
    @IsString()
    uid: string;

    @IsString()
    name: string;

    @IsNumber()
    price: number;

    @IsNumber()
    quantity: number;
}

// Manager
class ProductManager extends EntityManagerImpl<Product> {
    public toEntity(item: any): Product {
        return TransformUtil.toClass(Product, item);
    }

    public get prefix(): string {
        return 'product:';
    }
}

// Using it in chaincode
async function createProduct(ctx, id, name, price, quantity) {
    const manager = new ProductManager(logger, stub);

    const product = new Product();
    product.uid = id;
    product.name = name;
    product.price = price;
    product.quantity = quantity;

    await manager.save(product);
}

async function updateProductQuantity(ctx, id, newQuantity) {
    const manager = new ProductManager(logger, stub);

    const product = await manager.get(id);
    product.quantity = newQuantity;

    await manager.save(product);
}

async function deleteProduct(ctx, id) {
    const manager = new ProductManager(logger, stub);
    await manager.remove(id);
}
```

### Example 2: Entity relationships

```typescript
// Models
class Post implements IUIDable {
    @IsString()
    uid: string;

    @IsString()
    title: string;

    @IsString()
    content: string;
}

class Comment implements IUIDable {
    @IsString()
    uid: string;

    @IsString()
    postId: string;

    @IsString()
    text: string;

    @IsString()
    authorId: string;
}

// Managers
class PostManager extends EntityManagerImpl<Post> {
    public toEntity(item: any): Post {
        return TransformUtil.toClass(Post, item);
    }
    public get prefix(): string { return 'post:'; }
}

class CommentManager extends EntityManagerImpl<Comment> {
    public toEntity(item: any): Comment {
        return TransformUtil.toClass(Comment, item);
    }
    public get prefix(): string { return 'comment:'; }
}

// Creating a relation
const commentManager = new CommentManager(logger, stub);
const commentRelation = new EntityRelationChild(
    'post',
    'comment',
    commentManager
);

// Adding a comment to a post
async function addComment(ctx, commentId, postId, text, authorId) {
    const comment = new Comment();
    comment.uid = commentId;
    comment.postId = postId;
    comment.text = text;
    comment.authorId = authorId;

    await commentManager.save(comment);
    await commentRelation.childLinkAdd(commentId, postId);
}

// Getting all comments of a post
async function getPostComments(ctx, postId, pageSize = 10, bookmark = '') {
    const result = await commentRelation.childList({ pageSize, pageBookmark: bookmark }, postId);

    return {
        comments: result.items,
        nextBookmark: result.pageBookmark,
        hasMore: !result.isAllLoaded
    };
}

// Removing a post along with all its comments
async function deletePost(ctx, postId) {
    const postManager = new PostManager(logger, stub);

    // Removes the post and all related comments
    await commentRelation.parentRemove(postId);
    await postManager.remove(postId);
}
```

### Example 3: Custom serialization

```typescript
class CustomEntityManager extends EntityManager<MyEntity> {
    protected async serialize(item: MyEntity): Promise<any> {
        // Custom serialization logic
        return {
            id: item.uid,
            data: encrypt(JSON.stringify(item)),
            timestamp: Date.now()
        };
    }

    protected async deserialize(item: any, details?: Array<keyof MyEntity>): Promise<MyEntity> {
        if (!item) return null;

        // Custom deserialization logic
        const decrypted = decrypt(item.data);
        const entity = JSON.parse(decrypted);

        await this.loadDetails(entity, details);
        return entity;
    }

    public async loadDetails(item: MyEntity, details?: Array<keyof MyEntity>): Promise<void> {
        // Load related data
        if (details?.includes('author')) {
            item.author = await this.loadAuthor(item.authorId);
        }
    }

    public get prefix(): string {
        return 'custom:';
    }
}
```

## Interfaces

### IStub

Interface for working with the Hyperledger Fabric stub. You need to create an adapter that implements this interface.

```typescript
interface IStub {
    readonly user: IStubUser;
    readonly requestId: string;
    readonly transaction: IStubTransaction;

    getState<U>(key: string, type?: ClassType<U>): Promise<U>;
    getStateRaw(key: string): Promise<string>;
    getStateByRange(startKey: string, endKey: string): Promise<StateQueryIterator>;
    getStateByRangeWithPagination(startKey: string, endKey: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<StateQueryIterator>>;

    putState<U>(key: string, value: U, options: IPutStateOptions): Promise<U>;
    putStateRaw(key: string, value: string): Promise<void>;

    hasState(key: string): Promise<boolean>;
    removeState(key: string): Promise<void>;

    loadKV(iterator: StateQueryIterator): Promise<Array<IKeyValue>>;
    getPaginatedKV(request: IPageBookmark, start: string, finish: string): Promise<IPaginationBookmark<IKeyValue>>;
}
```

### IKeyValue

```typescript
interface IKeyValue {
    key: string;
    value?: string;
}
```

## Development

### Requirements

- Node.js >= 14
- TypeScript >= 4.0
- Hyperledger Fabric >= 2.0

### Building the Project

```bash
# Install dependencies
npm install

# Build (creates dist/cjs and dist/esm)
make build

# Clean
make clean
```

### Project Structure

```
hlf-core-chaincode/
├── src/
│   ├── database/
│   │   ├── entity/
│   │   │   ├── EntityManager.ts           # Abstract entity manager
│   │   │   ├── EntityManagerImpl.ts       # Implementation with validation
│   │   │   ├── EntityRelation.ts          # Relationship management
│   │   │   └── EntityRelationChild.ts     # Relations with cascade deletion
│   │   └── DatabaseManager.ts             # Base database manager
│   ├── stub/
│   │   ├── IStub.ts                       # Stub interface
│   │   └── IStubHolder.ts                 # Holder for stub
│   └── public-api.ts                      # Public API
├── dist/                                  # Compiled code
│   ├── cjs/                               # CommonJS
│   └── esm/                               # ES Modules
├── package.json
├── tsconfig.json
└── README.md
```

## License

ISC

## Author

**Renat Gubaev**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Links

- [GitHub Repository](https://github.com/ManhattanDoctor/hlf-core-chaincode)
- [NPM Package](https://www.npmjs.com/package/@hlf-core/chaincode)
- [Issue Tracker](https://github.com/ManhattanDoctor/hlf-core-chaincode/issues)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

## Support

If you found a bug or have a suggestion for improvement, please open an issue in [GitHub Issues](https://github.com/ManhattanDoctor/hlf-core-chaincode/issues).
