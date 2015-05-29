#
# Copyright (c) 2014, Joyent, Inc.
#

#
# Tools
#
NODE		:= node
NPM		:= npm
BUNYAN		:= ./node_modules/.bin/bunyan
TAPE		:= ./node_modules/.bin/tape
FAUCET		:= ./node_modules/.bin/faucet
ESLINT		:= ./node_modules/.bin/eslint

#
# Files
#
JS_FILES	:= $(shell ls *.js) $(shell find lib test -name '*.js' | grep -v sql.js)
JSL_CONF_NODE	 = tools/jsl.node.conf
JSL_FILES_NODE   = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSSTYLE_FLAGS    = -C -f ./tools/jsstyle.conf

CLEAN_FILES	+= node_modules $(SHRINKWRAP) cscope.files

#
# Repo-specific targets
#
.PHONY: all
all: deps

.PHONY: deps
deps: | $(REPO_DEPS) $(NPM_EXEC)
	$(NPM_ENV) $(NPM) install

.PHONY: test
test: $(FAUCET)
	$(TAPE) test/*/*.test.js | $(FAUCET)

.PHONY: lint
lint: $(ESLINT)
	$(ESLINT) .

