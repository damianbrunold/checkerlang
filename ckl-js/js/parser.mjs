/*  Copyright (c) 2021 Damian Brunold, Gesundheitsdirektion Kanton Zürich

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

import { SyntaxError } from "./errors.mjs";
import { SourcePos, Lexer } from "./lexer.mjs";

import { 
    ValueBoolean,
    ValueDecimal,
    ValueInt,
    ValuePattern,
    ValueString 
} from "./values.mjs";

import {
    NodeAnd,
    NodeAssign,
    NodeAssignDestructuring,
    NodeBlock,
    NodeBreak,
    NodeContinue,
    NodeDef,
    NodeDeref,
    NodeDerefAssign,
    NodeDerefInvoke,
    NodeDefDestructuring,
    NodeError,
    NodeFor,
    NodeFuncall,
    NodeIdentifier,
    NodeIf,
    NodeIn,
    NodeLambda,
    NodeList,
    NodeListComprehension,
    NodeListComprehensionParallel,
    NodeListComprehensionProduct,
    NodeLiteral,
    NodeMap,
    NodeMapComprehension,
    NodeNot,
    NodeNull,
    NodeObject,
    NodeOr,
    NodeRequire,
    NodeReturn,
    NodeSet,
    NodeSetComprehension,
    NodeSetComprehensionParallel,
    NodeSetComprehensionProduct,
    NodeSpread,
    NodeWhile,
    NodeXor
} from "./nodes.mjs";

export class Parser {
    static parseScript(script, filename) {
        return new Parser().parse(new Lexer(script, filename).scan());
    }

    parse(lexer) {
        if (!lexer.hasNext()) return new NodeNull(new SourcePos(lexer.name, 1, 1));
        let result = this.parseBareBlock(lexer, true);
        if (lexer.hasNext()) throw new SyntaxError("Expected end of input but got '" + lexer.next() + "'", lexer.getPos());
        if (result instanceof NodeReturn) {
            result = result.expression;
        } else if (result instanceof NodeBlock) {
            let expressions = result.expressions;
            if (expressions.length > 0) {
                let lastexpr = expressions[expressions.length - 1];
                if (lastexpr instanceof NodeReturn) {
                    expressions[expressions.length - 1] = lastexpr.expression;
                }
            }
        }
        return result;
    }

    parseBareBlock(lexer, toplevel = false) {
        const block = new NodeBlock(lexer.getPosNext(), toplevel);
        let expression;
        if (lexer.peekn(1, "do", "keyword")) {
            expression = this.parseBlock(lexer);
        } else {
            expression = this.parseStatement(lexer, toplevel);
        }
        if (!lexer.hasNext()) {
            return expression;
        }
        block.add(expression);
        while (lexer.matchIf(";", "interpunction")) {
            if (!lexer.hasNext()) break;
            if (lexer.peekn(1, "do", "keyword")) {
                expression = this.parseBlock(lexer);
            } else {
                expression = this.parseStatement(lexer, toplevel);
            }
            block.add(expression);
        }
        if (block.expressions.length == 1 && !block.hasFinally() && !block.hasCatch()) {
            return block.expressions[0];
        }
        return block;
    }

    parseBlock(lexer) {
        const block = new NodeBlock(lexer.getPosNext());
        lexer.match("do", "keyword");
        while (!lexer.peekn(1, "end", "keyword") && !lexer.peekn(1, "catch", "keyword") && !lexer.peekn(1, "finally", "keyword")) {
            let expression;
            if (lexer.peekn(1, "do", "keyword")) {
                expression = this.parseBlock(lexer);
            } else {
                expression = this.parseStatement(lexer);
            }
            block.add(expression);
            if (lexer.peekn(1, "end", "keyword") || lexer.peekn(1, "catch", "keyword") || lexer.peekn(1, "finally", "keyword")) break;
            lexer.match(";", "interpunction");
            if (lexer.peekn(1, "end", "keyword") || lexer.peekn(1, "catch", "keyword") || lexer.peekn(1, "finally", "keyword")) break;
        }
        while (lexer.matchIf("catch", "keyword")) {
            let err;
            if (lexer.matchIf("all", "identifier")) {
                err = null;
            } else {
                err = this.parseExpression(lexer);
            }
            let expr;
            if (lexer.peekn(1, "do", "keyword")) {
                expr = this.parseBlock(lexer);
            } else {
                expr = this.parseStatement(lexer);
            }
            if (lexer.peekn(1, ";", "interpunction")) lexer.eat(1);
            block.addCatch(err, expr);
        }
        if (lexer.matchIf("finally", "keyword")) {
            while (!lexer.peekn(1, "end", "keyword")) {
                let expression;
                if (lexer.peekn(1, "do", "keyword")) {
                    expression = this.parseBlock(lexer);
                } else {
                    expression = this.parseStatement(lexer);
                }
                block.addFinally(expression);
                if (lexer.peekn(1, "end", "keyword")) break;
                lexer.match(";", "interpunction");
            }
        }
        lexer.match("end", "keyword");
        if (block.expressions.length == 1 && !block.hasFinally() && !block.hasCatch()) {
            return block.expressions[0];
        }
        return block;
    }

    parseStatement(lexer, toplevel = false) {
        let comment = "";
        if (!lexer.hasNext()) throw new SyntaxError("Unexpected end of input", lexer.getPos());
        if (lexer.peek().type === "string" && lexer.peekn(2, "def", "keyword")) {
            comment = lexer.next().value;
        }
        if (lexer.matchIf("require", "keyword")) {
            const pos = lexer.getPos();
            const modulespec = this.parseExpression(lexer);
            let unqualified = false;
            let symbols = null;
            let name = null;
            if (lexer.matchIf("unqualified", "identifier")) {
                unqualified = true;
            } else if (lexer.matchIf(["import", "["], ["identifier", "interpunction"])) {
                symbols = new Map();
                while (!lexer.peekn(1, "]", "interpunction")) {
                    const symbol = lexer.matchIdentifier();
                    let symbolname = symbol;
                    if (lexer.matchIf("as", "keyword")) {
                        symbolname = lexer.matchIdentifier();
                    }
                    symbols.set(symbol, symbolname);
                    if (!lexer.peekn(1, "]", "interpunction")) {
                        lexer.match(",", "interpunction");
                    }
                }
                lexer.match("]", "interpunction");
            } else if (lexer.matchIf("as", "keyword")) {
                name = lexer.matchIdentifier();
            }
            return new NodeRequire(modulespec, name, unqualified, symbols, pos);
        }

        if (lexer.matchIf("def", "keyword")) {
            const pos = lexer.getPos();
            if (lexer.matchIf("[", "interpunction")) {
                // handle destructuring def
                let identifiers = [];
                while (!lexer.peekn(1, "]", "interpunction")) {
                    let token = lexer.next();
                    if (token.type === "keyword") throw new SyntaxError("Cannot redefine keyword '" + token + "'", token.pos);
                    if (token.type !== "identifier") throw new SyntaxError("Expected identifier but got '" + token + "'", token.pos);
                    identifiers.push(token.value);
                    if (!lexer.peekn(1, "]", "interpunction")) lexer.match(",", "interpunction");
                }
                lexer.match("]", "interpunction");
                lexer.match("=", "operator");
                return new NodeDefDestructuring(identifiers, this.parseExpression(lexer), comment, pos);
            } else {
                // handle single var def
                const token = lexer.next();
                if (token.type === "keyword") throw new SyntaxError("Cannot redefine keyword '" + token + "'", token.pos);
                if (token.type !== "identifier") throw new SyntaxError("Expected identifier but got '" + token + "'", token.pos);
                if (lexer.peekn(1, "(", "interpunction")) {
                    return new NodeDef(token.value, this.parseFn(lexer, pos), comment, pos);
                } else {
                    lexer.match("=", "operator");
                    return new NodeDef(token.value, this.parseExpression(lexer), comment, pos);
                }
            }
        }

        if (lexer.matchIf("for", "keyword")) {
            const pos = lexer.getPos();
            const identifiers = [];
            if (lexer.matchIf("[", "interpunction")) {
                while (!lexer.peekn(1, "]", "interpunction")) {
                    const token = lexer.next();
                    if (token.type !== "identifier") throw new SyntaxError("Expected identifier in for loop but got '" + token + "'", token.pos);
                    identifiers.push(token.value);
                    if (!lexer.peekn(1, "]", "interpunction")) lexer.match(",", "interpunction");
                }
                lexer.match("]", "interpunction");
            } else {
                const token = lexer.next();
                if (token.type !== "identifier") throw new SyntaxError("Expected identifier in for loop but got '" + token + "'", token.pos);
                identifiers.push(token.value);
            }
            lexer.match("in", "keyword");
            let what = "values";
            if (lexer.matchIf("keys", "identifier")) what = "keys";
            else if (lexer.matchIf("values", "identifier")) what = "values";
            else if (lexer.matchIf("entries", "identifier")) what = "entries";
            const expression = this.parseExpression(lexer);
            if (lexer.peekn(1, "do", "keyword")) {
                return new NodeFor(identifiers, expression, this.parseBlock(lexer), what, pos);
            }
            return new NodeFor(identifiers, expression, this.parseExpression(lexer), what, pos);
        }

        if (lexer.matchIf("while", "keyword")) {
            const pos = lexer.getPos();
            const expr = this.parseOrExpr(lexer);
            const block = this.parseBlock(lexer);
            return new NodeWhile(expr, block, pos);
        }

        return this.parseExpression(lexer);
    }

    parseExpression(lexer) {
        if (lexer.peekn(1, "if", "keyword")) {
            const result = new NodeIf(lexer.getPos());
            while (lexer.matchIf("if", "keyword") || lexer.matchIf("elif", "keyword")) {
                const condition = this.parseOrExpr(lexer);
                lexer.match("then", "keyword");
                if (lexer.peekn(1, "do", "keyword")) {
                    result.addIf(condition, this.parseBlock(lexer));
                } else {
                    result.addIf(condition, this.parseOrExpr(lexer));
                }
            }

            if (lexer.matchIf("else", "keyword")) {
                if (lexer.peekn(1, "do", "keyword")) {
                    result.setElse(this.parseBlock(lexer));
                } else {
                    result.setElse(this.parseOrExpr(lexer));
                }
            }
            return result;
        }
        return this.parseOrExpr(lexer);
    }

    parseOrExpr(lexer) {
        const expr = this.parseAndExpr(lexer);
        if (lexer.peekn(1, "or", "keyword")) {
            const result = new NodeOr(lexer.getPosNext()).addOrClause(expr);
            while (lexer.matchIf("or", "keyword")) {
                result.addOrClause(this.parseAndExpr(lexer));
            }
            return result;
        } else if (lexer.matchIf("xor", "keyword")) {
            let pos = lexer.getPos();
            let secondExpr = this.parseAndExpr(lexer);
            let result = new NodeXor(pos, expr, secondExpr);
            while (lexer.matchIf("xor", "keyword")) {
                pos = lexer.getPos();
                secondExpr = this.parseAndExpr(lexer);
                result = new NodeXor(pos, result, secondExpr);
            }
            return result;
        }
        return expr;
    }

    parseAndExpr(lexer) {
        const expr = this.parseNotExpr(lexer);
        if (lexer.peekn(1, "and", "keyword")) {
            const result = new NodeAnd(expr, lexer.getPosNext());
            while (lexer.matchIf("and", "keyword")) {
                result.addAndClause(this.parseNotExpr(lexer));
            }
            return result;
        }
        return expr;
    }

    parseNotExpr(lexer) {
        if (lexer.matchIf("not", "keyword")) {
            const pos = lexer.getPos();
            return new NodeNot(this.parseRelExpr(lexer), pos);
        }
        return this.parseRelExpr(lexer);
    }

    parseRelExpr(lexer) {
        const expr = this.parseAddExpr(lexer);
        const relops = ["==", "!=", "<>", "<", "<=", ">", ">=", "is"];
        if (!lexer.hasNext() || !relops.includes(lexer.peek().value) || !["operator", "keyword"].includes(lexer.peek().type)) {
            return expr;
        }
        const result = new NodeAnd(null, lexer.getPosNext());
        let lhs = expr;
        while (lexer.hasNext() && relops.includes(lexer.peek().value) && ["operator", "keyword"].includes(lexer.peek().type)) {
            let relop = lexer.next().value;
            if (relop === "is" && lexer.peek().value === "not") {
                relop = "is not";
                lexer.eat(1);
            }
            const pos = lexer.getPos();
            const rhs = this.parseAddExpr(lexer);
            let cmp = null;
            switch (relop) {
                case "<":
                    cmp = this.funcCall("less", lhs, rhs, pos);
                    break;

                case "<=":
                    cmp = this.funcCall("less_equals", lhs, rhs, pos);
                    break;

                case ">":
                    cmp = this.funcCall("greater", lhs, rhs, pos);
                    break;

                case ">=":
                    cmp = this.funcCall("greater_equals", lhs, rhs, pos);
                    break;

                case "==":
                case "is":
                    cmp = this.funcCall("equals", lhs, rhs, pos);
                    break;

                case "<>":
                case "!=":
                case "is not":
                    cmp = this.funcCall("not_equals", lhs, rhs, pos);
                    break;
            }
            result.addAndClause(cmp);
            lhs = rhs;
        }
        return result.getSimplified();
    }

    parseAddExpr(lexer) {
        let expr = this.parseMulExpr(lexer);
        while (lexer.peekOne(1, ["+", "-"], "operator")) {
            if (lexer.matchIf("+", "operator")) {
                const pos = lexer.getPos();
                expr = this.funcCall("add", expr, this.parseMulExpr(lexer), pos);
            } else if (lexer.matchIf("-", "operator")) {
                const pos = lexer.getPos();
                expr = this.funcCall("sub", expr, this.parseMulExpr(lexer), pos);
            }
        }
        return expr;
    }

    parseMulExpr(lexer) {
        let expr = this.parseUnaryExpr(lexer);
        while (lexer.peekOne(1, ["*", "/", "%"], "operator")) {
            if (lexer.matchIf("*", "operator")) {
                const pos = lexer.getPos();
                expr = this.funcCall("mul", expr, this.parseUnaryExpr(lexer), pos);
            } else if (lexer.matchIf("/", "operator")) {
                const pos = lexer.getPos();
                expr = this.funcCall("div", expr, this.parseUnaryExpr(lexer), pos);
            } else if (lexer.matchIf("%", "operator")) {
                const pos = lexer.getPos();
                expr = this.funcCall("mod", expr, this.parseUnaryExpr(lexer), pos);
            }
        }
        return expr;
    }

    parseUnaryExpr(lexer) {
        if (lexer.matchIf("+", "operator")) {
            return this.parsePredExpr(lexer);
        }
        if (lexer.matchIf("-", "operator")) {
            const pos = lexer.getPos();
            const token = lexer.peek();
            if (token.type == "int") {
                return this.parsePredExpr(lexer, true);
            } else if (token.type == "decimal") {
                return this.parsePredExpr(lexer, true);
            } else {
                const call = new NodeFuncall(new NodeIdentifier("sub", pos), pos);
                call.addArg("a", new NodeLiteral(new ValueInt(0), pos));
                call.addArg("b", this.parsePredExpr(lexer));
                return call;
            }
        }
        return this.parsePredExpr(lexer);
    }

    parsePredExpr(lexer, unary_minus = false) {
        const expr = this.parsePrimaryExpr(lexer, unary_minus);
        const pos = lexer.getPosNext();

        if (lexer.matchIf("is", "keyword")) {
            if (lexer.matchIf("not", "keyword")) {
                if (lexer.matchIf("in")) {
                    return new NodeNot(new NodeIn(expr, this.parsePrimaryExpr(lexer), pos), pos);
                } else if (lexer.matchIf("empty", "identifier")) {
                    return new NodeNot(this.funcCall("is_empty", expr, null, pos), pos);
                } else if (lexer.matchIf("zero", "identifier")) {
                    return new NodeNot(this.funcCall("is_zero", expr, null, pos), pos);
                } else if (lexer.matchIf("negative", "identifier")) {
                    return new NodeNot(this.funcCall("is_negative", expr, null, pos), pos);
                } else if (lexer.matchIf("numerical", "identifier")) {
                    return new NodeNot(this.collectPredicateMinMaxExact("is_numerical", this.funcCall("string", expr, null, pos), lexer, pos), pos);
                } else if (lexer.matchIf("alphanumerical", "identifier")) {
                    return new NodeNot(this.collectPredicateMinMaxExact("is_alphanumerical", this.funcCall("string", expr, null, pos), lexer, pos), pos);
                } else if (lexer.matchIf(["date", "with", "hour"], ["identifier", "identifier", "identifier"])) {
                    return new NodeNot(this.funcCall2("is_valid_date", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("yyyyMMddHH"), pos), pos), pos);
                } else if (lexer.matchIf("date", "identifier")) {
                    return new NodeNot(this.funcCall2("is_valid_date", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("yyyyMMdd"), pos), pos), pos);
                } else if (lexer.matchIf("time", "identifier")) {
                    return new NodeNot(this.funcCall2("is_valid_time", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("HHmm"), pos), pos), pos);
                } else if (lexer.matchIf("string", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("string"), pos), pos), pos);
                } else if (lexer.matchIf("int", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("int"), pos), pos), pos);
                } else if (lexer.matchIf("decimal", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("decimal"), pos), pos), pos);
                } else if (lexer.matchIf("boolean", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("boolean"), pos), pos), pos);
                } else if (lexer.matchIf("pattern", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("pattern"), pos), pos), pos);
                } else if (lexer.matchIf("date", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("date"), pos), pos), pos);
                } else if (lexer.matchIf("null", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("null"), pos), pos), pos);
                } else if (lexer.matchIf("func", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("func"), pos), pos), pos);
                } else if (lexer.matchIf("input", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("input"), pos), pos), pos);
                } else if (lexer.matchIf("output", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("output"), pos), pos), pos);
                } else if (lexer.matchIf("list", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("lsit"), pos), pos), pos);
                } else if (lexer.matchIf("set", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("set"), pos), pos), pos);
                } else if (lexer.matchIf("map", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("map"), pos), pos), pos);
                } else if (lexer.matchIf("object", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("object"), pos), pos), pos);
                } else if (lexer.matchIf("node", "identifier")) {
                    return new NodeNot(this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("node"), pos), pos), pos);
                } else {
                    lexer.previous(); // not
                    lexer.previous(); // is
                    return expr;
                }
            } else if (lexer.matchIf("in", "keyword")) {
                return new NodeIn(expr, this.parsePrimaryExpr(lexer), pos);
            } else if (lexer.matchIf("empty", "identifier")) {
                return this.funcCall("is_empty", expr, null, pos);
            } else if (lexer.matchIf("zero", "identifier")) {
                return this.funcCall("is_zero", expr, null, pos);
            } else if (lexer.matchIf("negative", "identifier")) {
                return this.funcCall("is_negative", expr, null, pos);
            } else if (lexer.matchIf("numerical", "identifier")) {
                return this.collectPredicateMinMaxExact("is_numerical", this.funcCall("string", expr, null, pos), lexer, pos);
            } else if (lexer.matchIf("alphanumerical", "identifier")) {
                return this.collectPredicateMinMaxExact("is_alphanumerical", this.funcCall("string", expr, null, pos), lexer, pos);
            } else if (lexer.matchIf(["date", "with", "hour"], ["identifier", "identifier", "identifier"])) {
                return this.funcCall2("is_valid_date", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("yyyyMMddHH"), pos), pos);
            } else if (lexer.matchIf("date", "identifier")) {
                return this.funcCall2("is_valid_date", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("yyyyMMdd"), pos), pos);
            } else if (lexer.matchIf("time", "identifier")) {
                return this.funcCall2("is_valid_time", "str", this.funcCall("string", expr, null, pos), "fmt", new NodeLiteral(new ValueString("HHmm"), pos), pos);
            } else if (lexer.matchIf("string", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("string"), pos), pos);
            } else if (lexer.matchIf("int", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("int"), pos), pos);
            } else if (lexer.matchIf("decimal", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("decimal"), pos), pos);
            } else if (lexer.matchIf("boolean", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("boolean"), pos), pos);
            } else if (lexer.matchIf("pattern", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("pattern"), pos), pos);
            } else if (lexer.matchIf("date", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("date"), pos), pos);
            } else if (lexer.matchIf("null", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("null"), pos), pos);
            } else if (lexer.matchIf("func", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("func"), pos), pos);
            } else if (lexer.matchIf("input", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("input"), pos), pos);
            } else if (lexer.matchIf("output", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("output"), pos), pos);
            } else if (lexer.matchIf("list", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("list"), pos), pos);
            } else if (lexer.matchIf("set", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("set"), pos), pos);
            } else if (lexer.matchIf("map", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("map"), pos), pos);
            } else if (lexer.matchIf("object", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("object"), pos), pos);
            } else if (lexer.matchIf("node", "identifier")) {
                return this.funcCall("equals", this.funcCall("type", expr, null, pos), new NodeLiteral(new ValueString("node"), pos), pos);
            }
            lexer.previous(); // is
            return expr;
        } else if (lexer.matchIf(["not", "in"], "keyword")) {
            return new NodeNot(new NodeIn(expr, this.parsePrimaryExpr(lexer), pos), pos);
        } else if (lexer.matchIf("in", "keyword")) {
            return new NodeIn(expr, this.parsePrimaryExpr(lexer), pos);
        } else if (lexer.matchIf(["starts", "not", "with"], ["identifier", "keyword", "identifier"])) {
            return new NodeNot(this.funcCall2("starts_with", "str", expr, "part", this.parsePrimaryExpr(lexer), pos), pos);
        } else if (lexer.matchIf(["starts", "with"], ["identifier", "identifier"])) {
            return this.funcCall2("starts_with", "str", expr, "part", this.parsePrimaryExpr(lexer), pos);
        } else if (lexer.matchIf(["ends", "not", "with"], ["identifier", "keyword", "identifier"])) {
            return new NodeNot(this.funcCall2("ends_with", "str", expr, "part", this.parsePrimaryExpr(lexer), pos), pos);
        } else if (lexer.matchIf(["ends", "with"], ["identifier", "identifier"])) {
            return this.funcCall2("ends_with", "str", expr, "part", this.parsePrimaryExpr(lexer), pos);
        } else if (lexer.matchIf(["contains", "not"], ["identifier", "keyword"])) {
            return new NodeNot(this.funcCall2("contains", "obj", expr, "part", this.parsePrimaryExpr(lexer), pos), pos);
        } else if (lexer.matchIf("contains", "identifier")) {
            return this.funcCall2("contains", "obj", expr, "part", this.parsePrimaryExpr(lexer), pos);
        } else if (lexer.matchIf(["matches", "not"], ["identifier", "keyword"])) {
            return new NodeNot(this.funcCall2("matches", "str", expr, "pattern", this.parsePrimaryExpr(lexer), pos), pos);
        } else if (lexer.matchIf("matches", "identifier")) {
            return this.funcCall2("matches", "str", expr, "pattern", this.parsePrimaryExpr(lexer), pos);
        }

        return expr;
    }

    collectPredicateMinMaxExact(fn, expr, lexer, pos) {
        let min_len = new NodeLiteral(new ValueInt(0), pos);
        let max_len = new NodeLiteral(new ValueInt(9999), pos);
        if (lexer.matchIf("min_len", "identifier")) {
            min_len = this.parsePrimaryExpr(lexer);
        }

        if (lexer.matchIf("max_len", "identifier")) {
            max_len = this.parsePrimaryExpr(lexer);
        }

        if (lexer.matchIf("exact_len", "identifier")) {
            min_len = max_len = this.parsePrimaryExpr(lexer);
        }

        return this.funcCall3(fn, "str", expr, "min", min_len, "max", max_len, pos);
    }


    parsePrimaryExpr(lexer, unary_minus = false) {
        if (!lexer.hasNext()) throw new SyntaxError("Unexpected end of input", lexer.getPos());

        let result;

        let token = lexer.next();
        if (token.value === "(" && token.type == "interpunction") {
            result = this.parseBareBlock(lexer, false);
            lexer.match(")", "interpunction");
            return this.derefOrCallOrInvoke(lexer, result);
        }

        switch (token.type) {
            case "identifier":
                result = new NodeIdentifier(token.value, token.pos);
                if (lexer.matchIf("=", "operator")) {
                    result = new NodeAssign(token.value, this.parseExpression(lexer), token.pos);
                } else if (lexer.matchIf("+=", "operator")) {
                    const value = this.parseExpression(lexer);
                    result = new NodeAssign(token.value, this.funcCall("add", result, value, token.pos), token.pos);
                    break;
                } else if (lexer.matchIf("-=", "operator")) {
                    const value = this.parseExpression(lexer);
                    result = new NodeAssign(token.value, this.funcCall("sub", result, value, token.pos), token.pos);
                    break;
                } else if (lexer.matchIf( "*=", "operator")) {
                    const value = this.parseExpression(lexer);
                    result = new NodeAssign(token.value, this.funcCall("mul", result, value, token.pos), token.pos);
                    break;
                } else if (lexer.matchIf( "/=", "operator")) {
                    const value = this.parseExpression(lexer);
                    result = new NodeAssign(token.value, this.funcCall("div", result, value, token.pos), token.pos);
                    break;
                } else if (lexer.matchIf( "%=", "operator")) {
                    const value = this.parseExpression(lexer);
                    result = new NodeAssign(token.value, this.funcCall("mod", result, value, token.pos), token.pos);
                    break;
                } else {
                    result = this.derefOrCallOrInvoke(lexer, result);
                }
                break;

            case "string":
                result = new NodeLiteral(new ValueString(token.value), token.pos);
                result = this.derefOrInvoke(lexer, result);
                break;

            case "int":
                result = new NodeLiteral(new ValueInt(Number(token.value) * (unary_minus ? -1 : 1)), token.pos);
                result = this.invoke(lexer, result);
                break;

            case "decimal":
                result = new NodeLiteral(new ValueDecimal(Number(token.value) * (unary_minus ? -1 : 1)), token.pos);
                result = this.invoke(lexer, result);
                break;

            case "boolean":
                result = new NodeLiteral(ValueBoolean.from(token.value === "TRUE"), token.pos);
                result = this.invoke(lexer, result);
                break;

            case "pattern":
                result = new NodeLiteral(new ValuePattern(token.value.substring(2, token.value.length - 2)), token.pos);
                result = this.invoke(lexer, result);
                break;

            default:
                if (token.value === "fn" && token.type == "keyword") {
                    result = this.parseFn(lexer, token.pos);
                } else if (token.value === "break" && token.type == "keyword") {
                    result = new NodeBreak(token.pos);
                } else if (token.value === "continue" && token.type == "keyword") {
                    result = new NodeContinue(token.pos);
                } else if (token.value === "return" && token.type == "keyword") {
                    if (lexer.peekn(1, ";", "interpunction")) result = new NodeReturn(null, token.pos);
                    else result = new NodeReturn(this.parseExpression(lexer), token.pos);
                } else if (token.value === "error" && token.type == "keyword") {
                    result = new NodeError(this.parseExpression(lexer), token.pos);
                } else if (token.value === "do" && token.type == "keyword") {
                    lexer.previous();
                    result = this.parseBlock(lexer);
                } else if (token.value === "[" && token.type == "interpunction") {
                    result = this.parseListLiteral(lexer, token);
                    if (lexer.peekn(1, "=", "operator")) {
                        const identifiers = [];
                        for (const item of result.items) {
                            if (!(item instanceof NodeIdentifier)) throw new SyntaxError("Destructuring assign expected identifier but got " + item, token.pos);
                            identifiers.push(item.value);
                        }
                        lexer.match("=", "operator");
                        result = new NodeAssignDestructuring(identifiers, this.parseExpression(lexer), token.pos);
                    }
                } else if (token.value === "<<" && token.type == "interpunction") {
                    result = this.parseSetLiteral(lexer, token);
                } else if (token.value === "<<<" && token.type == "interpunction") {
                    result = this.parseMapLiteral(lexer, token);
                } else if (token.value === "<*" && token.type == "interpunction") {
                    result = this.parseObjectLiteral(lexer, token);
                } else if (token.value === "..." && token.type == "interpunction") {
                    token = lexer.next();
                    if (token.value === "[" && token.type == "interpunction") {
                        result = this.parseListLiteral(lexer, token);
                    } else if (token.value === "<<<" && token.type == "interpunction") {
                        result = this.parseMapLiteral(lexer, token);
                    } else if (token.type == "identifier") {
                        result = new NodeIdentifier(token.value, token.pos);
                    } else {
                        throw new SyntaxError("Spread operator only allowed with identifiers, list and map literals", token.pos);
                    }
                    result = new NodeSpread(result, token.pos);
                } else {
                    throw new SyntaxError("Invalid syntax at '" + token + "'", token.pos);
                }
                break;
        }
        return result;
    }

    parseListLiteral(lexer, token) {
        if (lexer.matchIf("]", "interpunction")) {
            return this.derefOrInvoke(lexer, new NodeList(token.pos));
        } else {
            let expr = this.parseExpression(lexer);
            if (lexer.matchIf("for", "keyword")) {
                const identifier = lexer.matchIdentifier();
                lexer.match("in", "keyword");
                let what = undefined;
                if (lexer.matchIf("keys", "identifier")) what = "keys";
                else if (lexer.matchIf("values", "identifier")) what = "values";
                else if (lexer.matchIf("entries", "identifier")) what = "entries";
                const listExpr = this.parseOrExpr(lexer);
                if (lexer.matchIf("for", "keyword")) {
                    const identifier2 = lexer.matchIdentifier();
                    lexer.match("in", "keyword");
                    let what2 = undefined;
                    if (lexer.matchIf("keys", "identifier")) what2 = "keys";
                    else if (lexer.matchIf("values", "identifier")) what2 = "values";
                    else if (lexer.matchIf("entries", "identifier")) what2 = "entries";
                    const listExpr2 = this.parseOrExpr(lexer);
                    const comprehension = new NodeListComprehensionProduct(expr, identifier, listExpr, what, identifier2, listExpr2, what2, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match("]", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                } else if (lexer.matchIf(["also", "for"], "keyword")) {
                    const identifier2 = lexer.matchIdentifier();
                    lexer.match("in", "keyword");
                    let what2 = undefined;
                    if (lexer.matchIf("keys", "identifier")) what2 = "keys";
                    else if (lexer.matchIf("values", "identifier")) what2 = "values";
                    else if (lexer.matchIf("entries", "identifier")) what2 = "entries";
                    const listExpr2 = this.parseOrExpr(lexer);
                    const comprehension = new NodeListComprehensionParallel(expr, identifier, listExpr, what, identifier2, listExpr2, what2, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match("]", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                } else {
                    const comprehension = new NodeListComprehension(expr, identifier, listExpr, what, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match("]", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                }
            } else {
                const list = new NodeList(token.pos);
                while (!lexer.peekn(1, "]", "interpunction")) {
                    list.addItem(expr);
                    expr = null;
                    if (!lexer.peekn(1, "]", "interpunction")) {
                        lexer.match(",", "interpunction");
                        if (!lexer.peekn(1, "]", "interpunction")) {
                            expr = this.parseExpression(lexer);
                        }
                    }
                }
                if (expr != null) list.addItem(expr);
                lexer.match("]", "interpunction");
                return this.derefOrInvoke(lexer, list);
            }
        }
    }

    parseSetLiteral(lexer, token) {
        if (lexer.matchIf(">>", "interpunction")) {
            return this.derefOrInvoke(lexer, new NodeSet(token.pos));
        } else {
            const expr = this.parseExpression(lexer);
            if (lexer.matchIf("for", "keyword")) {
                const identifier = lexer.matchIdentifier();
                lexer.match("in", "keyword");
                let what = undefined;
                if (lexer.matchIf("keys", "identifier")) what = "keys";
                else if (lexer.matchIf("values", "identifier")) what = "values";
                else if (lexer.matchIf("entries", "identifier")) what = "entries";
                const listExpr = this.parseOrExpr(lexer);
                if (lexer.matchIf("for", "keyword")) {
                    const identifier2 = lexer.matchIdentifier();
                    lexer.match("in", "keyword");
                    let what2 = undefined;
                    if (lexer.matchIf("keys", "identifier")) what2 = "keys";
                    else if (lexer.matchIf("values", "identifier")) what2 = "values";
                    else if (lexer.matchIf("entries", "identifier")) what2 = "entries";
                    const listExpr2 = this.parseOrExpr(lexer);
                    const comprehension = new NodeSetComprehensionProduct(expr, identifier, listExpr, what, identifier2, listExpr2, what2, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match(">>", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                } else if (lexer.matchIf(["also", "for"], "keyword")) {
                    const identifier2 = lexer.matchIdentifier();
                    lexer.match("in", "keyword");
                    let what2 = undefined;
                    if (lexer.matchIf("keys", "identifier")) what2 = "keys";
                    else if (lexer.matchIf("values", "identifier")) what2 = "values";
                    else if (lexer.matchIf("entries", "identifier")) what2 = "entries";
                    const listExpr2 = this.parseOrExpr(lexer);
                    const comprehension = new NodeSetComprehensionParallel(expr, identifier, listExpr, what, identifier2, listExpr2, what2, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match(">>", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                } else {
                    const comprehension = new NodeSetComprehension(expr, identifier, listExpr, what, token.pos);
                    if (lexer.matchIf("if", "keyword")) {
                        comprehension.setCondition(this.parseOrExpr(lexer));
                    }
                    lexer.match(">>", "interpunction");
                    return this.derefOrInvoke(lexer, comprehension);
                }
            } else {
                const set = new NodeSet(token.pos);
                set.addItem(expr);
                if (!lexer.peekn(1, ">>", "interpunction")) {
                    lexer.match(",", "interpunction");
                }
                while (!lexer.peekn(1, ">>", "interpunction")) {
                    set.addItem(this.parseExpression(lexer));
                    if (!lexer.peekn(1, ">>", "interpunction")) {
                        lexer.match(",", "interpunction");
                    }
                }
                lexer.match(">>", "interpunction");
                return this.derefOrInvoke(lexer, set);
            }
        }
    }

    parseMapLiteral(lexer, token) {
        if (lexer.matchIf(">>>", "interpunction")) {
            return this.derefOrInvoke(lexer, new NodeMap(token.pos));
        } else {
            let key = this.parseExpression(lexer);
            lexer.match("=>", "interpunction");
            let value = this.parseExpression(lexer);
            if (lexer.matchIf("for", "keyword")) {
                const identifier = lexer.matchIdentifier();
                lexer.match("in", "keyword");
                let what = undefined;
                if (lexer.matchIf("keys", "identifier")) what = "keys";
                else if (lexer.matchIf("values", "identifier")) what = "values";
                else if (lexer.matchIf("entries", "identifier")) what = "entries";
                const listExpr = this.parseOrExpr(lexer);
                const comprehension = new NodeMapComprehension(key, value, identifier, listExpr, what, token.pos);
                if (lexer.matchIf("if", "keyword")) {
                    comprehension.setCondition(this.parseOrExpr(lexer));
                }
                lexer.match(">>>", "interpunction");
                return this.derefOrInvoke(lexer, comprehension);
            } else {
                const map = new NodeMap(token.pos);
                if (key instanceof NodeIdentifier) {
                    key = new NodeLiteral(new ValueString(key.value), key.pos);
                }
                map.addKeyValue(key, value);
                if (!lexer.peekn(1, ">>>", "interpunction")) {
                    lexer.match(",", "interpunction");
                }
                while (!lexer.peekn(1, ">>>", "interpunction")) {
                    key = this.parseExpression(lexer);
                    if (key instanceof NodeIdentifier) {
                        key = new NodeLiteral(new ValueString(key.value), key.pos);
                    }
                    lexer.match("=>", "interpunction");
                    value = this.parseExpression(lexer);
                    map.addKeyValue(key, value);
                    if (!lexer.peekn(1, ">>>", "interpunction")) {
                        lexer.match(",", "interpunction");
                    }
                }
                lexer.match(">>>", "interpunction");
                return this.derefOrInvoke(lexer, map);
            }
        }
    }

    parseObjectLiteral(lexer, token) {
        const obj = new NodeObject(token.pos);
        while (!lexer.peekn(1, "*>", "interpunction")) {
            const key = lexer.matchIdentifier();
            if (lexer.peekn(1, "(", "interpunction")) {
                const fn = this.parseFn(lexer, lexer.getPos());
                obj.addKeyValue(key, fn);
            } else {
                lexer.match("=", "operator");
                const value = this.parseExpression(lexer);
                obj.addKeyValue(key, value);
            }
            if (!lexer.peekn(1, "*>", "interpunction")) {
                lexer.match(",", "interpunction");
            }
        }
        lexer.match("*>", "interpunction");
        return this.derefOrInvoke(lexer, obj);
    }

    parseFn(lexer, pos) {
        const lambda = new NodeLambda(pos);
        lexer.match("(", "interpunction");
        while (!lexer.matchIf(")", "interpunction")) {
            const token = lexer.next();
            if (token.type == "keyword") throw new SyntaxError("Cannot use keyword '" + token + "' as parameter name", token.pos);
            if (token.type != "identifier") throw new SyntaxError("Expected parameter name but got '" + token + "'", token.pos);
            const argname = token.value;
            let defvalue = null;
            if (lexer.matchIf("=", "operator")) {
                defvalue = this.parseExpression(lexer);
            }
            lambda.addArg(argname, defvalue);
            if (argname.endsWith("...") && !lexer.peekn(1, ")", "interpunction")) {
                throw new SyntaxError("Rest argument " + argname + " must be last argument", token.pos);
            }
            if (!lexer.peekn(1, ")", "interpunction")) lexer.match(",", "interpunction");
        }
        if (lexer.peekn(1, "do", "keyword")) {
            lambda.setBody(this.parseBlock(lexer));
        } else {
            lambda.setBody(this.parseExpression(lexer));
        }
        return lambda;
    }

    _invoke(lexer, node) {
        if (lexer.matchIf("!>", "operator")) {
            let fn = null;
            if (lexer.matchIf(["(", "fn"], ["interpunction", "keyword"])) {
                fn = this.parseFn(lexer, lexer.getPos());
                lexer.match(")", "interpunction");
            } else {
                fn = new NodeIdentifier(lexer.matchIdentifier(), lexer.getPos());
                while (lexer.matchIf("->", "operator")) {
                    fn = new NodeDeref(fn, new NodeLiteral(new ValueString(lexer.matchIdentifier()), lexer.getPos()), null, lexer.getPos());
                }
            }
            const call = new NodeFuncall(fn, lexer.getPos());
            call.addArg(null, node);
            lexer.match("(", "interpunction");
            while (!lexer.peekn(1, ")", "interpunction")) {
                if (lexer.peek().type == "identifier" && lexer.peekn(2, "=", "operator")) {
                    const name = lexer.matchIdentifier();
                    lexer.match("=", "operator");
                    call.addArg(name, this.parseExpression(lexer));
                } else {
                    call.addArg(null, this.parseExpression(lexer));
                }
                if (!lexer.peekn(1, ")", "interpunction")) lexer.match(",", "interpunction");
            }
            lexer.eat(1);
            node = call;
        }
        return node;
    }

    _call(lexer, node) {
        if (lexer.matchIf("(", "interpunction")) {
            const call = new NodeFuncall(node, lexer.getPos());
            while (!lexer.peekn(1, ")", "interpunction")) {
                if (lexer.peek().type === "identifier" && lexer.peekn(2, "=", "operator")) {
                    const name = lexer.matchIdentifier();
                    lexer.match("=", "operator");
                    call.addArg(name, this.parseExpression(lexer));
                } else {
                    call.addArg(null, this.parseExpression(lexer));
                }
                if (!lexer.peekn(1, ")", "interpunction")) lexer.match(",", "interpunction");
            }
            lexer.eat(1);
            node = call;
        }
        return node;        
    }

    _deref(lexer, node) {
        let interrupt = false;
        if (lexer.matchIf("->", "operator")) {
            const pos = lexer.getPos();
            const identifier = lexer.matchIdentifier();
            const index = new NodeLiteral(new ValueString(identifier), pos);
            if (lexer.matchIf("=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, value, pos);
                interrupt = true;
            } else if (lexer.matchIf("(", "interpunction")) {
                node = new NodeDerefInvoke(node, identifier, pos);
                while (!lexer.peekn(1, ")", "interpunction")) {
                    if (lexer.peek().type === "identifier" && lexer.peekn(2, "=", "operator")) {
                        const name = lexer.matchIdentifier();
                        lexer.match("=", "operator");
                        node.addArg(name, this.parseExpression(lexer));
                    } else {
                        node.addArg(null, this.parseExpression(lexer));
                    }
                    if (!lexer.peekn(1, ")", "interpunction")) lexer.match(",", "interpunction");
                }
                lexer.eat(1);
            } else if (lexer.matchIf("+=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("add", new NodeDeref(node, index, null, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf("-=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("sub", new NodeDeref(node, index, null, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf("*=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("mul", new NodeDeref(node, index, null, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf("/=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("div", new NodeDeref(node, index, null, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf("%=", "operator")) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("mod", new NodeDeref(node, index, null, pos), value, pos), pos);
                interrupt = true;
            } else {
                node = new NodeDeref(node, index, null, pos);
            }
        } else if (lexer.matchIf("[", "interpunction")) {
            const pos = lexer.getPos();
            const index = this.parseExpression(lexer);
            let default_value = null;
            if (lexer.matchIf(",", "interpunction")) {                
                default_value = this.parseExpression(lexer);
            }
            if (lexer.matchIf(["]", "="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, value, pos);
                interrupt = true;
            } else if (lexer.matchIf(["]", "+="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("add", new NodeDeref(node, index, default_value, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf(["]", "-="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("sub", new NodeDeref(node, index, default_value, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf(["]", "*="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("mul", new NodeDeref(node, index, default_value, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf(["]", "/="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("div", new NodeDeref(node, index, default_value, pos), value, pos), pos);
                interrupt = true;
            } else if (lexer.matchIf(["]", "%="], ["interpunction", "operator"])) {
                const value = this.parseExpression(lexer);
                node = new NodeDerefAssign(node, index, this.funcCall("mod", new NodeDeref(node, index, default_value, pos), value, pos), pos);
                interrupt = true;
            } else {
                node = new NodeDeref(node, index, default_value, pos);
                lexer.match("]", "interpunction");
            }
        }        
        return [node, interrupt];
    }

    derefOrCallOrInvoke(lexer, node) {
        while (lexer.peekn(1, "!>", "operator") || lexer.peekn(1, "[", "interpunction") || lexer.peekn(1, "(", "interpunction") || lexer.peekn(1, "->", "operator")) {
            if (lexer.peekn(1, "!>", "operator")) {
                node = this._invoke(lexer, node);
            } else if (lexer.peekn(1, "(", "interpunction")) {
                node = this._call(lexer, node);
            } else if (lexer.peekn(1, "[", "interpunction") || lexer.peekn(1, "->", "operator")) {
                let result = this._deref(lexer, node);
                node = result[0];
                if (result[1]) break;
            }
        }
        return node;
    }

    derefOrInvoke(lexer, node) {
        while (lexer.peekn(1, "!>", "operator") || lexer.peekn(1, "[", "interpunction") || lexer.peekn(1, "->", "operator")) {
            if (lexer.peekn(1, "!>", "operator")) {
                node = this._invoke(lexer, node);
            } else if (lexer.peekn(1, "[", "interpunction") || lexer.peekn(1, "->", "operator")) {
                let result = this._deref(lexer, node);
                node = result[0];
                if (result[1]) break;
            }
        }
        return node;
    }

    invoke(lexer, node) {
        while (lexer.peekn(1, "!>", "operator")) {
            node = this._invoke(lexer, node);
        }
        return node;
    }

    funcCall(fn, exprA, exprB, pos) {
        const result = new NodeFuncall(new NodeIdentifier(fn, pos), pos);
        if (exprB !== null) {
            return this.funcCall2(fn, "a", exprA, "b", exprB, pos);
        } else {
            return this.funcCall1(fn, "obj", exprA, pos);
        }
        return result;
    }

    funcCall1(fn, a, exprA, pos) {
        const result = new NodeFuncall(new NodeIdentifier(fn, pos), pos);
        result.addArg(a, exprA);
        return result;
    }

    funcCall2(fn, a, exprA, b, exprB, pos) {
        const result = new NodeFuncall(new NodeIdentifier(fn, pos), pos);
        result.addArg(a, exprA);
        result.addArg(b, exprB);
        return result;
    }

    funcCall3(fn, a, exprA, b, exprB, c, exprC, pos) {
        const result = new NodeFuncall(new NodeIdentifier(fn, pos), pos);
        result.addArg(a, exprA);
        result.addArg(b, exprB);
        result.addArg(c, exprC);
        return result;
    }
}
