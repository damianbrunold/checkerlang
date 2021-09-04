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
package ch.checkerlang.functions;

import ch.checkerlang.*;
import ch.checkerlang.values.Value;
import ch.checkerlang.values.ValueNode;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

public class FuncParse extends FuncBase {
    public FuncParse() {
        super("parse");
        info = "parse(s)\r\n" +
                "\r\n" +
                "Parses the string s.\r\n" +
                "\r\n" +
                ": parse('2+3') ==> '(add 2, 3)'\r\n";
    }

    public List<String> getArgNames() {
        return Arrays.asList("s");
    }

    public Value execute(Args args, Environment environment, SourcePos pos) {
        try {
            return new ValueNode(Parser.parse(args.getString("s").getValue(), pos.filename));
        } catch (IOException e) {
            throw new ControlErrorException("Cannot parse expression " + args.getString("s"), pos);
        }
    }
}
