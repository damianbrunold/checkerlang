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

import ch.checkerlang.Args;
import ch.checkerlang.Environment;
import ch.checkerlang.SourcePos;
import ch.checkerlang.values.Value;
import ch.checkerlang.values.ValueBoolean;

import java.util.Arrays;
import java.util.List;

public class FuncEndsWith extends FuncBase {
    public FuncEndsWith() {
        super("ends_with");
        info = "ends_with(str, part)\r\n" +
                "\r\n" +
                "Returns TRUE if the string str ends with part.\r\n" +
                "\r\n" +
                ": ends_with('abcdef', 'def') ==> TRUE\r\n" +
                ": ends_with('abcdef', 'abc') ==> FALSE\r\n" +
                ": ends_with(NULL, 'abc') ==> FALSE\r\n";
    }

    public List<String> getArgNames() {
        return Arrays.asList("str", "part");
    }

    public Value execute(Args args, Environment environment, SourcePos pos) {
        if (args.isNull("str")) return ValueBoolean.FALSE;
        return ValueBoolean.from(args.getString("str").getValue().endsWith(args.getString("part").getValue()));
    }
}
