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
package ch.checkerlang.nodes;

import ch.checkerlang.ControlErrorException;
import ch.checkerlang.Environment;
import ch.checkerlang.SourcePos;
import ch.checkerlang.values.Value;
import ch.checkerlang.values.ValueBoolean;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

public class NodeWhile implements Node {
    private Node expression;
    private Node block;

    private SourcePos pos;

    public NodeWhile(Node expression, Node block, SourcePos pos) {
        this.expression = expression;
        this.block = block;
        this.pos = pos;
    }

    public Value evaluate(Environment environment) {
        Value condition = expression.evaluate(environment);
        if (!condition.isBoolean()) throw new ControlErrorException("Expected boolean condition but got " + condition.type(), pos);
        Value result = ValueBoolean.TRUE;
        while (condition.asBoolean() == ValueBoolean.TRUE) {
            result = block.evaluate(environment);
            if (result.isBreak()) {
                result = ValueBoolean.TRUE;
                break;
            } else if (result.isContinue()) {
                result = ValueBoolean.TRUE;
                // continue
            } else if (result.isReturn()) {
                break;
            }
            condition = expression.evaluate(environment);
            if (!condition.isBoolean()) throw new ControlErrorException("Expected boolean condition but got " + condition.type(), pos);
        }
        return result;
    }

    public String toString() {
        return "(while " + expression + " do " + block + ")";
    }

    public void collectVars(Collection<String> freeVars, Collection<String> boundVars, Collection<String> additionalBoundVars) {
        expression.collectVars(freeVars, boundVars, additionalBoundVars);
        Set<String> boundVarsLocal = new HashSet<>(boundVars);
        block.collectVars(freeVars, boundVarsLocal, additionalBoundVars);
    }

    public SourcePos getSourcePos() {
        return pos;
    }

    public boolean isLiteral() {
        return false;
    }
}
