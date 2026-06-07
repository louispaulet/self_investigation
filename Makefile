.PHONY: up stories test build deploy

up:
	cd web && npm run dev

stories:
	python3 scripts/build_average_hour_stories.py --sync-web

test:
	python3 -m unittest discover -s tests
	cd web && npm run test

build:
	cd web && npm run build

deploy: build
	cd web && npx gh-pages -d dist --dotfiles --nojekyll --before-add ./gh-pages-before-add.cjs
