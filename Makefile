.PHONY: up test build deploy

up:
	cd web && npm run dev

test:
	cd web && npm run lint

build:
	cd web && npm run build

deploy: build
	cd web && npx gh-pages -d dist --dotfiles --nojekyll --before-add ./gh-pages-before-add.cjs
