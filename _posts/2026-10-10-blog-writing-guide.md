---
title: 블로그 글쓰기 치트시트
description: Chirpy 테마에서 글 쓸 때 쓰는 문법 모음. 첫 글 겸 나중에 찾아보기용.
date: 2026-10-10 10:00:00 +0900
categories: [블로그, 설정]
tags: [jekyll, chirpy, markdown]
pin: true
---

이 글은 테스트 겸 문법 참고용입니다. 필요 없어지면 `_posts/2026-10-10-blog-writing-guide.md`{: .filepath } 파일을 지우면 됩니다.

## 새 글 쓰는 법

`_posts` 폴더에 `YYYY-MM-DD-제목.md` 형식으로 파일을 만듭니다. 파일 이름은 영문·숫자·하이픈만 쓰는 게 안전하고, 이게 그대로 URL이 됩니다.

맨 위 머리말(front matter)에 아래 항목을 넣습니다.

```yaml
---
title: 글 제목
description: 목록과 검색 결과에 보이는 한 줄 요약
date: 2026-10-10 10:00:00 +0900
categories: [상위분류, 하위분류]   # 최대 2단계
tags: [태그1, 태그2]              # 개수 제한 없음, 소문자 권장
pin: true                         # 홈 맨 위에 고정
math: true                        # 수식 쓸 때만
mermaid: true                     # 다이어그램 쓸 때만
---
```

> `categories`는 2개까지만 쓸 수 있고, `tags`는 자유입니다. 날짜는 미래로 적으면 글이 안 보입니다.
{: .prompt-warning }

작성 중인 글은 `_drafts` 폴더에 날짜 없는 파일명으로 두면 배포되지 않습니다.

## 강조 박스

Chirpy에서 가장 많이 쓰게 되는 기능입니다. 인용문 바로 아래에 `{: .prompt-종류 }`를 붙입니다.

> 알아두면 좋은 팁입니다.
{: .prompt-tip }

> 참고할 정보입니다.
{: .prompt-info }

> 주의가 필요합니다.
{: .prompt-warning }

> 하면 안 되는 것입니다.
{: .prompt-danger }

```markdown
> 내용
{: .prompt-tip }
```

## 코드

언어 이름을 붙이면 문법 강조가 됩니다.

```python
def solve(nums: list[int]) -> int:
    return sum(n for n in nums if n % 2 == 0)
```

파일명을 함께 보여주고 싶으면 코드블록 아래에 붙입니다.

```javascript
const sum = (a, b) => a + b;
```
{: file="src/utils.js" }

특정 줄을 강조하거나 줄번호를 끄는 것도 됩니다.

```text
줄번호 없이 보여주고 싶을 때
```
{: .nolineno }

## 이미지

이미지는 `assets/img/` 아래에 넣고 아래처럼 씁니다.

```markdown
![설명](/assets/img/posts/example.png)
_이미지 아래 캡션_

<!-- 크기 지정 (레이아웃 밀림 방지용으로 권장) -->
![설명](/assets/img/posts/example.png){: width="700" height="400" }

<!-- 정렬 -->
![설명](/assets/img/posts/example.png){: .normal }
![설명](/assets/img/posts/example.png){: .left }
![설명](/assets/img/posts/example.png){: .shadow }
```

> 없는 이미지 경로를 적으면 배포 과정의 링크 검사(html-proofer)에서 빌드가 실패합니다. 파일을 먼저 넣고 경로를 쓰세요.
{: .prompt-danger }

## 표

| 항목 | 설명 | 기본값 |
|:-----|:-----|-------:|
| toc | 목차 표시 | true |
| comments | 댓글 | false |
| pin | 상단 고정 | false |

## 할 일 목록

- [x] 테마 설정 채우기
- [x] 소개 페이지 쓰기
- [ ] 첫 진짜 글 쓰기

## 각주와 링크

각주도 됩니다[^note]. 본문 중 코드는 `backtick`으로 감쌉니다.

## 수식과 다이어그램

머리말에 `math: true`를 넣으면 LaTeX 수식이, `mermaid: true`를 넣으면 다이어그램이 렌더링됩니다. 필요한 글에만 켜는 게 좋습니다 (스크립트를 추가로 불러옴).

[^note]: 글 맨 아래에 자동으로 모입니다.
