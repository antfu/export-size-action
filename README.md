# export-size-action
GitHub Actions for [export-size](https://github.com/antfu/export-size)

![image](https://user-images.githubusercontent.com/11247099/98110849-b1d28600-1eda-11eb-9fae-c0ed2216f5b1.png)

## Usage

Add the following action inside `.github/workflows/export-size.yml`

```yaml
name: Export Size
on:
  pull_request:
    branches:
      - main
      - master

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: antfu/export-size-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### Monorepo

```yaml
  - uses: antfu/export-size-action@v1
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      paths: package/core,package/foo
```
