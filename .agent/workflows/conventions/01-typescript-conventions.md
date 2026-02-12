---
description: TypeScript/React 코드 컨벤션 및 Biome 설정
---

# TypeScript 코드 컨벤션

## 원칙

1. **가독성을 최우선**으로 삼는다. 코드는 그 자체가 문서의 역할을 해야 한다.
2. 이 문서와 **Biome** 설정이 충돌할 경우, Biome 설정을 수정하여 조정한다.

---

## 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트·클래스 | PascalCase | `TextInput`, `Products` |
| 변수·함수·매개변수 | camelCase | `someText`, `getAge()` |
| 메서드 | camelCase, 동사(명령형) + 명사 | `getAge`, `fetchDomains` |
| boolean 반환 메서드 | `is`, `can`, `has`, `should` 선호 | `isActive`, `hasEmail`, `canAccept` |
| 상수 | CONSTANT_CASE | `MAX_RETRY_COUNT` |
| 폴더명 | camelCase | `domainGroups`, `shared` |

```tsx
export function TextInput(): ReactNode {}
function getAge(): number {}
function isActive(): boolean {}
const SOME_CONSTANT = 1 as const;
```

### 줄임말

- 뒤에 추가 단어가 오지 않으면 모두 대문자: `productID`, `httpCode`
- 변수명은 축약하지 않고 풀어쓴다. 반복문 index(`i`, `j`)는 예외.

```tsx
// wrong
products.forEach((p) => {});

// good
products.forEach((product, index) => {});
products.forEach((product, i) => {
  product.items.forEach((item, j) => {});
});
```

---

## 파일·모듈

### 파일 배치

- 컴포넌트·클래스는 각각 독립된 소스 파일에 둔다.
- 작은 컴포넌트 몇 개를 한 파일에 묶는 것이 자연스러울 경우 예외 허용.

### 파일명

| 종류 | 케이스 | 예시 |
|------|--------|------|
| 컴포넌트 | PascalCase | `TextInput.tsx`, `DomainRow.tsx` |
| Hooks | camelCase | `useUser.ts`, `useDomainStatus.ts` |
| 타입 정의 | kebab-case, `.d.ts` | `domain.d.ts`, `domain-group.ts` |
| 스키마 | kebab-case, `.schema.ts` | `user.schema.ts` |
| 기타 | kebab-case | `invoke.ts`, `searchable-input.ts` |

### Export

- **default export**는 특별한 이유가 있을 때만 사용. TanStack Router 라우트 파일은 예외.
- `index.ts`에서 모듈 단위로 export 리스트업.

```tsx
// wrong
const TextInput = () => {};
export default TextInput;

// good
export const TextInput = () => {};
```

```ts
// shared/ui/form/index.ts
export { TextInput } from './TextInput';
```

---

## Tauri invoke (FE–BE 연동)

백엔드 호출 시 [04-fe-be-connection](../plans/04-fe-be-connection.md) 패턴을 따른다.

| 항목 | 규칙 |
|------|------|
| 인자 | `{ payload: { ... } }` 형태, 필드는 camelCase |
| 응답 | `ApiResponse<T>`: `success`, `message`, `data` |
| 타입 | `invoke<ResponseType>("command_name", args)` 제네릭 지정 |

```ts
const response = await invoke<{ success: boolean; data: Domain[] }>('get_domains');
if (response.success) {
  setDomains(response.data ?? []);
}
```

---

## 코드 스타일

### 변수 가리기 (shadowing)

- 허용하지 않는다. 외부 변수와 이름이 겹치면 내부 변수는 다른 이름 사용.

### 중괄호

- 중괄호 안 코드가 한 줄이어도 반드시 `{ }` 사용.

```tsx
// wrong
if (num > 10) return true;

// good
if (num > 10) {
  return true;
}
```

### 변수 선언

- 한 줄에 변수 하나만 선언.

```tsx
// wrong
let num, canRead;

// good
let num = 10;
let canRead = false;
```

### switch

- `default` 케이스 필수. 의도적으로 미처리 시 `throw Error()` 사용.

```tsx
switch (type) {
  case 'product':
    // ...
    break;
  default:
    throw new Error('지원하지 않는 타입');
}
```

### 재귀 함수

- 이름 뒤에 `Recursive` 접미사 사용.

```tsx
function getFibonacciRecursive(num: number): number {}
```

### null/undefined 처리

- **non-null assertion (`!`)** 은 사용하지 않는다. 대신 조건문으로 분기한다.

```tsx
// wrong
const el = document.getElementById("root")!;

// good
const el = document.getElementById("root");
if (el) {
  // ...
}
```

### 타입에서 void vs undefined

- request/response 타입에는 `undefined`를 사용한다. `void`는 반환 타입 전용.

```ts
// wrong
request?: void;
response: void;

// good
request?: undefined;
response: undefined;
```

---

## 데이터·경계

- 외부(API, 사용자 입력 등)로 들어오는 데이터는 **경계 시점에 검증**한다.
- 경계를 넘어 온 데이터는 내부에서 유효하다고 가정한다.
- 예외는 **경계에서만 처리**하고, 내부 함수에서는 예외를 던지지 않도록 한다.

---

## Biome 설정

프로젝트 `biome.json`과 이 컨벤션을 일치시킨다. 핵심 규칙:

| 항목 | 설정 |
|------|------|
| indent | space 2 |
| quoteStyle | double (프로젝트 통일) |
| lineWidth | 120 |
| files.includes | `["src/**", "!**/*.gen.ts"]` — 자동 생성 파일 제외 |
| useBlockStatements | error (중괄호 필수) |
| useConst | error |
| useNamingConvention | error (네이밍 규칙 강제) |
| noShadow (nursery) | error (변수 가리기 금지) |
| noUselessTernary | error |
| noNonNullAssertion | warn |
| noConfusingVoidType | warn |
| useExhaustiveDependencies | warn (useEffect 의존성 배열) |

`useNamingConvention` 옵션:
- strictCase: false (productID, httpCode 등 줄임말 허용)
- typeProperty, objectLiteralProperty: camelCase, snake_case (BE API 응답 snake_case 대응)
- 그 외: 이 문서 네이밍 표와 동일
