# 시사상식 스터디 소재 카드 저장소

Google Apps Script 웹앱 API + Google Sheets를 데이터 저장소처럼 사용해서, 시사상식 스터디용 소재를 카드 형태로 저장/조회하는 정적 웹앱입니다.

- 프레임워크 없음 (Vanilla HTML/CSS/JavaScript)
- 빌드 과정 없음
- GitHub Pages에 바로 배포 가능
- 1차 버전 기능: 추가, 조회, 검색, 대분류 필터, 최신순 정렬

## 파일 구조

```text
.
├── index.html
├── style.css
├── script.js
└── README.md
```

## Apps Script URL 설정 방법

1. `script.js`를 열고 아래 상수를 실제 웹앱 URL로 변경합니다.

```js
const API_URL = "APPS_SCRIPT_WEB_APP_URL";
```

2. Apps Script 웹앱은 **배포(Deploy) > 웹 앱**으로 배포하고, 일반적으로 `/exec` 형태 URL을 사용합니다.
3. 목록 조회는 아래 GET 엔드포인트를 호출합니다.

```text
${API_URL}?action=list
```

4. 소재 추가는 `POST ${API_URL}`로 JSON body를 전송합니다.

## GitHub Pages 배포 방법

1. GitHub 저장소 루트에 이 4개 파일을 커밋/푸시합니다.
2. GitHub 저장소에서 `Settings > Pages`로 이동합니다.
3. `Build and deployment`에서 Source를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`(또는 사용하는 기본 브랜치), 폴더를 `/ (root)`로 선택하고 저장합니다.
5. 몇 분 뒤 발급된 Pages URL에서 앱이 동작합니다.

## Google Sheets 컬럼 구조

Sheets에는 아래 컬럼을 권장합니다.

1. `id`
2. `createdAt`
3. `studyCode`
4. `author`
5. `category`
6. `title`
7. `description`
8. `point`
9. `source`

앱의 목록 렌더링은 다음 필드를 사용합니다.

- `id`, `createdAt`, `author`, `category`, `title`, `description`, `point`, `source`

## CORS 문제가 날 때 확인할 점

1. Apps Script 웹앱 배포 권한이 외부에서 접근 가능한지 확인합니다.
2. `API_URL`이 최신 배포 URL인지 확인합니다. (재배포 후 URL이 바뀌었는지 점검)
3. Apps Script `doPost`에서 JSON 파싱 로직이 `application/json`과 fallback용 `text/plain` 모두 처리 가능한지 확인합니다.
4. 브라우저 개발자도구 Network 탭에서 `POST` 실패 응답/리다이렉트 여부를 확인합니다.
5. 이 앱은 기본 `fetch POST`가 실패하면 `mode: "no-cors"` fallback으로 재전송하고, 이후 목록을 다시 불러오도록 구현되어 있습니다.

## 참고

- 출처(`source`) 값이 `http://` 또는 `https://` URL이면 카드에서 클릭 가능한 링크로 표시됩니다.
- 화면 출력 시 문자열 escape 처리로 XSS 위험을 줄였습니다.
