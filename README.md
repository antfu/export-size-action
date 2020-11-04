# export-size-action (WIP)

Add the following action inside `.github/workflows/export-size.yml`

```yaml
name: export-size
on:
  pull_request:
    branches:
      - master
jobs:
  size:
    runs-on: ubuntu-latest
    env:
      CI_JOB_NUMBER: 1
    steps:
      - uses: actions/checkout@v1
      - uses: antfu/export-size-action@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
