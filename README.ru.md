[English](./README.md) · **Русский**

# @hlf-core/chaincode

> TypeScript библиотека для разработки chaincode в Hyperledger Fabric

[![npm version](https://img.shields.io/npm/v/@hlf-core/chaincode.svg)](https://www.npmjs.com/package/@hlf-core/chaincode)
[![Документация](https://img.shields.io/badge/docs-hlf.gnosisai.ru-1f6feb)](https://hlf.gnosisai.ru/docs/packages/chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Полная документация: https://hlf.gnosisai.ru/docs/packages/chaincode

## Описание

`@hlf-core/chaincode` — это высокоуровневая TypeScript библиотека для разработки chaincode (смарт-контрактов) в Hyperledger Fabric. Она предоставляет абстракции и инструменты для управления данными, сущностями и их отношениями в блокчейн-реестре.

### Основные возможности

- ** Управление базой данных** — работа с key-value хранилищем Hyperledger Fabric
- ** Управление сущностями** — ORM-подобный API для работы с бизнес-объектами
- ** Отношения между сущностями** — управление связями parent-child между объектами
- ** Пагинация** — эффективная работа с большими наборами данных
- ** Валидация и трансформация** — автоматическая сериализация/десериализация с валидацией
- ** TypeScript** — полная типизация и поддержка современных возможностей языка
- ** Dual Package** — поддержка как CommonJS, так и ES Modules

## Установка

```bash
npm install @hlf-core/chaincode
```

### Зависимости

Библиотека требует следующие пакеты:

```bash
npm install @hlf-core/common @ts-core/common fabric-shim reflect-metadata
```

`@hlf-core/common` предоставляет `StateKey` — сборку ключей состояния, на которой построены связи между сущностями.

## Быстрый старт

### 1. Определение сущности

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

### 2. Создание менеджера сущностей

```typescript
import { EntityManagerImpl } from '@hlf-core/chaincode';
import { ILogger, TransformUtil } from '@ts-core/common';
import { IStub } from '@hlf-core/chaincode';

export class UserManager extends EntityManagerImpl<User> {
    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub);
    }

    // Обязательный метод: преобразование из plain object в класс
    public toEntity(item: any): User {
        return TransformUtil.toClass(User, item);
    }

    // Префикс для хранения в блокчейне
    public get prefix(): string {
        return 'user:';
    }

    // Опционально: загрузка связанных данных
    public async loadDetails(item: User, details?: Array<keyof User>): Promise<void> {
        // Загрузка дополнительных данных, если нужно
    }
}
```

### 3. Использование в chaincode

```typescript
import { Context } from 'fabric-contract-api';

export class MyContract {
    async createUser(ctx: Context, userId: string, name: string, age: number, email: string): Promise<void> {
        const logger = // ваш logger
        const stub = // адаптер для ctx.stub

        const userManager = new UserManager(logger, stub);

        const user = new User();
        user.uid = userId;
        user.name = name;
        user.age = age;
        user.email = email;

        // Сохранение с автоматической валидацией и сериализацией
        await userManager.save(user);
    }

    async getUser(ctx: Context, userId: string): Promise<User> {
        const logger = // ваш logger
        const stub = // адаптер для ctx.stub

        const userManager = new UserManager(logger, stub);

        // Получение с автоматической десериализацией и валидацией
        return await userManager.get(userId);
    }

    async getAllUsers(ctx: Context, pageSize: number, bookmark?: string): Promise<any> {
        const logger = // ваш logger
        const stub = // адаптер для ctx.stub

        const userManager = new UserManager(logger, stub);

        // Получение с пагинацией
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

## API Документация

### DatabaseManager

Базовый класс для работы с key-value хранилищем.

#### Методы

##### `getKV(start: string, finish?: string): Promise<Array<IKeyValue>>`

Получает все пары ключ-значение в диапазоне.

```typescript
const kv = await databaseManager.getKV('user:', 'user:￰');
```

##### `getKeys(start: string, finish?: string): Promise<Array<string>>`

Получает только ключи в диапазоне.

```typescript
const keys = await databaseManager.getKeys('user:');
```

##### `getValues(start: string, finish?: string): Promise<Array<string>>`

Получает только значения в диапазоне.

```typescript
const values = await databaseManager.getValues('user:');
```

##### `getPaginatedKV(request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>>`

Получает пары ключ-значение с пагинацией.

```typescript
const result = await databaseManager.getPaginatedKV(
    { pageSize: 10, pageBookmark: '' },
    'user:'
);
```

### EntityManager<T>

Абстрактный класс для управления сущностями. Наследуется от `DatabaseManager`.

#### Методы CRUD

##### `get(item: UID, details?: Array<keyof T>): Promise<T>`

Получает сущность по ID.

```typescript
const user = await userManager.get('user123');
```

##### `getMany(items: Array<UID>, details?: Array<keyof T>): Promise<Array<T>>`

Получает несколько сущностей по ID.

```typescript
const users = await userManager.getMany(['user1', 'user2', 'user3']);
```

##### `save(item: T): Promise<T>`

Сохраняет сущность (создание или обновление).

```typescript
await userManager.save(user);
```

##### `saveMany(items: Array<T>): Promise<Array<T>>`

Сохраняет несколько сущностей.

```typescript
await userManager.saveMany([user1, user2, user3]);
```

##### `saveIfNotExists(item: T): Promise<T>`

Сохраняет сущность только если она еще не существует.

```typescript
await userManager.saveIfNotExists(user);
```

##### `has(item: UID): Promise<boolean>`

Проверяет существование сущности.

```typescript
const exists = await userManager.has('user123');
```

##### `remove(item: UID): Promise<void>`

Удаляет сущность.

```typescript
await userManager.remove('user123');
```

##### `removeMany(items: Array<UID>): Promise<void>`

Удаляет несколько сущностей.

```typescript
await userManager.removeMany(['user1', 'user2']);
```

#### Методы поиска

Оба метода принимают один объект запроса:

```typescript
interface IEntityQuery<U = any, T = any> {
    prefix?: string;                              // где искать; по умолчанию префикс менеджера
    details?: Array<keyof U>;                     // какие связанные данные подгрузить
    transform?: (item: string) => T | Promise<T>; // как превратить значение записи в сущность
}

interface IEntityPageQuery<U = any, T = any> extends IEntityQuery<U, T>, IPageBookmark { }
```

##### `find(query?: IEntityQuery<T>): Promise<Array<T>>`

Находит все сущности с заданным префиксом.

```typescript
const allUsers = await userManager.find();

const withDetails = await userManager.find({ details: ['company'] });

const byPrefix = await userManager.find({ prefix: 'user_2026' });
```

Метод вычитывает весь диапазон целиком. В chaincode это означает, что размер набора чтения растёт линейно с числом записей — на больших выборках используйте `findPaginated`.

##### `findPaginated(query: IEntityPageQuery<T>): Promise<IPaginationBookmark<T>>`

Находит сущности постранично.

```typescript
const result = await userManager.findPaginated({
    pageSize: 20,
    pageBookmark: 'bookmark123',
    details: ['company']
});

console.log(result.items);           // Array<User>
console.log(result.pageBookmark);    // Следующий bookmark
console.log(result.isAllLoaded);     // Все ли загружено
```

`IPaginableBookmark` из `@ts-core/common` структурно совместим с `IEntityPageQuery`, поэтому DTO списочного запроса можно передавать напрямую. Условия и сортировка из него в chaincode не применяются — используются только `pageSize`, `pageBookmark` и `details`.

#### Абстрактные методы

При наследовании от `EntityManager` необходимо реализовать:

```typescript
// Префикс для ключей в блокчейне
abstract get prefix(): string;

// Сериализация сущности для хранения
protected abstract serialize<V = any>(item: T): Promise<V>;

// Десериализация сущности из хранилища
protected abstract deserialize(item: any, details?: Array<keyof T>): Promise<T>;

// Загрузка дополнительных данных
public abstract loadDetails(item: T, details?: Array<keyof T>): Promise<void>;
```

### EntityManagerImpl<T>

Реализация `EntityManager` с автоматической сериализацией и валидацией через `class-validator` и `class-transformer`.

При наследовании нужно реализовать только:

```typescript
// Преобразование plain object в класс
public abstract toEntity(item: any): T;

// Префикс для ключей
public abstract get prefix(): string;

// Опционально: загрузка связанных данных
public async loadDetails(item: T, details?: Array<keyof T>): Promise<void> {
    // Реализация опциональна
}
```

### EntityRelation

Управление отношениями между сущностями.

```typescript
import { EntityRelation } from '@hlf-core/chaincode';

// Создание связи между постом и комментариями
const relation = new EntityRelation(
    stub,
    'post',      // родительский префикс
    'comment'    // дочерний префикс
);

// Добавление связи
await relation.childLinkAdd('comment123', 'post456');

// Проверка связи
const hasLink = await relation.childLinkHas('comment123', 'post456');

// Удаление связи
await relation.childLinkRemove('comment123', 'post456');

// Удаление всех связей для дочернего элемента
await relation.childRemove('comment123');

// Удаление родителя и получение всех дочерних ID
const childIds = await relation.parentRemove('post456');
```

#### Как хранятся связи

На каждую связь пишутся два ключа — прямой и обратный:

```
→link:post~comment:post456~comment123    → comment123
→link:comment~post:comment123~post456    → post456
```

Прямой ключ обслуживает выборку детей по родителю: диапазонный запрос по префиксу `→link:post~comment:post456~` возвращает всех детей. Обратный нужен, чтобы снять связи, зная только ребёнка — `childRemove` не требует знать родителя.

Ключи собирает `StateKey` из `@hlf-core/common`, поэтому части ключа проверяются, а префикс поиска всегда заканчивается разделителем — родитель `post4` не захватит детей родителя `post45`.

#### Составной родитель

Родитель может состоять из нескольких частей — тогда поиск возможен по любой левой части. Это удобно, когда связь адресуется парой значений:

```typescript
// связь ордера со счётом: монета + владелец
await relation.childAdd(otcUid, coinUid, ownerUid);

// ключ: →link:account~otc:<coinUid>~<ownerUid>~<otcUid>

// все ордера по монете
relation.childListQuery(coinUid);

// ордера конкретного владельца по этой монете
relation.childListQuery(coinUid, ownerUid);
```

Части передаются отдельными аргументами, а не склеенной строкой: разделитель внутри значения сдвинул бы границы частей, поэтому такая строка отклоняется с `StateKeySegmentInvalidError`.

```typescript
await relation.childAdd(otcUid, `${coinUid}~${ownerUid}`);   // ошибка
await relation.childAdd(otcUid, coinUid, ownerUid);          // верно
```

### EntityRelationChild<T, M>

Расширение `EntityRelation` с автоматическим управлением дочерними сущностями.

```typescript
import { EntityRelationChild } from '@hlf-core/chaincode';

const commentRelation = new EntityRelationChild(
    'post',              // родительский префикс
    'comment',           // дочерний префикс
    commentManager       // менеджер для Comment
);

// Получение всех комментариев поста с пагинацией
const comments = await commentRelation.childList({ pageSize: 10 }, 'post456');

// Удаление поста и всех его комментариев
const deletedCommentIds = await commentRelation.parentRemove('post456');
```

## Архитектура

```
┌─────────────────────────────────────────┐
│           IStub Interface               │
│  (Абстракция над fabric-shim)           │
└───────────────┬─────────────────────────┘
                │
                │ использует
                ▼
┌─────────────────────────────────────────┐
│        DatabaseManager                  │
│  • getKV / putKV                        │
│  • getKeys / getValues                  │
│  • getPaginatedKV                       │
└───────────────┬─────────────────────────┘
                │
                │ наследует
                ▼
┌─────────────────────────────────────────┐
│        EntityManager<T>                 │
│  • get / save / remove                  │
│  • find / findPaginated                 │
│  • serialize / deserialize (abstract)   │
└───────────────┬─────────────────────────┘
                │
                │ наследует
                ▼
┌─────────────────────────────────────────┐
│      EntityManagerImpl<T>               │
│  • Автоматическая сериализация          │
│  • Автоматическая валидация             │
│  • toEntity(item) (abstract)            │
└─────────────────────────────────────────┘
                │
                │ используется в
                ▼
        ┌───────────────┐
        │ Ваш Chaincode │
        └───────────────┘
```

### Отношения между сущностями

```
┌──────────────────────┐
│   EntityRelation     │
│  • Управление связями│
│  • childAdd/Remove   │
│  • parentRemove      │
└──────────┬───────────┘
           │
           │ наследует
           ▼
┌──────────────────────────────┐
│  EntityRelationChild<T, M>   │
│  • childList (с пагинацией)  │
│  • Каскадное удаление        │
└──────────────────────────────┘
```

## Примеры использования

### Пример 1: Простое CRUD приложение

```typescript
import { EntityManagerImpl } from '@hlf-core/chaincode';
import { IsString, IsNumber } from 'class-validator';
import { IUIDable, TransformUtil } from '@ts-core/common';

// Модель
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

// Менеджер
class ProductManager extends EntityManagerImpl<Product> {
    public toEntity(item: any): Product {
        return TransformUtil.toClass(Product, item);
    }

    public get prefix(): string {
        return 'product:';
    }
}

// Использование в chaincode
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

### Пример 2: Отношения между сущностями

```typescript
// Модели
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

// Менеджеры
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

// Создание связи
const commentManager = new CommentManager(logger, stub);
const commentRelation = new EntityRelationChild(
    'post',
    'comment',
    commentManager
);

// Добавление комментария к посту
async function addComment(ctx, commentId, postId, text, authorId) {
    const comment = new Comment();
    comment.uid = commentId;
    comment.postId = postId;
    comment.text = text;
    comment.authorId = authorId;

    await commentManager.save(comment);
    await commentRelation.childLinkAdd(commentId, postId);
}

// Получение всех комментариев поста
async function getPostComments(ctx, postId, pageSize = 10, bookmark = '') {
    const result = await commentRelation.childList({ pageSize, pageBookmark: bookmark }, postId);

    return {
        comments: result.items,
        nextBookmark: result.pageBookmark,
        hasMore: !result.isAllLoaded
    };
}

// Удаление поста со всеми комментариями
async function deletePost(ctx, postId) {
    const postManager = new PostManager(logger, stub);

    // Удаляет пост и все связанные комментарии
    await commentRelation.parentRemove(postId);
    await postManager.remove(postId);
}
```

### Пример 3: Кастомная сериализация

```typescript
class CustomEntityManager extends EntityManager<MyEntity> {
    protected async serialize(item: MyEntity): Promise<any> {
        // Кастомная логика сериализации
        return {
            id: item.uid,
            data: encrypt(JSON.stringify(item)),
            timestamp: Date.now()
        };
    }

    protected async deserialize(item: any, details?: Array<keyof MyEntity>): Promise<MyEntity> {
        if (!item) return null;

        // Кастомная логика десериализации
        const decrypted = decrypt(item.data);
        const entity = JSON.parse(decrypted);

        await this.loadDetails(entity, details);
        return entity;
    }

    public async loadDetails(item: MyEntity, details?: Array<keyof MyEntity>): Promise<void> {
        // Загрузка связанных данных
        if (details?.includes('author')) {
            item.author = await this.loadAuthor(item.authorId);
        }
    }

    public get prefix(): string {
        return 'custom:';
    }
}
```

## Интерфейсы

### IStub

Интерфейс для работы с Hyperledger Fabric stub. Необходимо создать адаптер, реализующий этот интерфейс.

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

## Разработка

### Требования

- Node.js >= 14
- TypeScript >= 4.0
- Hyperledger Fabric >= 2.0

### Сборка проекта

```bash
# Установка зависимостей
npm install

# Сборка (создает dist/cjs и dist/esm)
make build

# Очистка
make clean
```

### Структура проекта

```
hlf-core-chaincode/
├── src/
│   ├── database/
│   │   ├── entity/
│   │   │   ├── EntityManager.ts           # Абстрактный менеджер сущностей
│   │   │   ├── EntityManagerImpl.ts       # Реализация с валидацией
│   │   │   ├── EntityRelation.ts          # Управление связями
│   │   │   └── EntityRelationChild.ts     # Связи с каскадным удалением
│   │   └── DatabaseManager.ts             # Базовый менеджер БД
│   ├── stub/
│   │   ├── IStub.ts                       # Интерфейс stub
│   │   └── IStubHolder.ts                 # Holder для stub
│   └── public-api.ts                      # Публичный API
├── dist/                                  # Скомпилированный код
│   ├── cjs/                               # CommonJS
│   └── esm/                               # ES Modules
├── package.json
├── tsconfig.json
└── README.md
```

## Лицензия

ISC

## Автор

**Ренат Губаев**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Ссылки

- [GitHub Repository](https://github.com/ManhattanDoctor/hlf-core-chaincode)
- [NPM Package](https://www.npmjs.com/package/@hlf-core/chaincode)
- [Issue Tracker](https://github.com/ManhattanDoctor/hlf-core-chaincode/issues)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

## Поддержка

Если вы нашли баг или у вас есть предложение по улучшению, пожалуйста, создайте issue в [GitHub Issues](https://github.com/ManhattanDoctor/hlf-core-chaincode/issues).
