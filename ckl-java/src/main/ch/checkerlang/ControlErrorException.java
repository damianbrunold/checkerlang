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
package ch.checkerlang;

import ch.checkerlang.values.Value;
import ch.checkerlang.values.ValueString;

public class ControlErrorException extends CheckerlangException {
    private Value type;
    private Value value;
    private Stacktrace stacktrace;

    public ControlErrorException(String message) {
        super(SourcePos.Unknown);
        type = new ValueString("ERROR");
        value = new ValueString(message);
        stacktrace = new Stacktrace();
    }

    public ControlErrorException(String message, SourcePos pos) {
        super(pos);
        type = new ValueString("ERROR");
        value = new ValueString(message);
        stacktrace = new Stacktrace();
    }

    public ControlErrorException(Value value, SourcePos pos, Stacktrace stacktrace) {
        super(pos);
        type = new ValueString("ERROR");
        this.value = value;
        this.stacktrace = stacktrace;
    }

    public ControlErrorException(Value type, Value value, SourcePos pos, Stacktrace stacktrace) {
        super(pos);
        this.type = type;
        this.value = value;
        this.stacktrace = stacktrace;
    }

    public Value getErrorType() { return type; }
    public Value getErrorValue() {
        return value;
    }

    public Stacktrace getStacktrace() {
        return stacktrace;
    }

    public void addStacktraceElement(String funcall, SourcePos pos) {
        stacktrace.addElement(funcall, pos);
    }

}
