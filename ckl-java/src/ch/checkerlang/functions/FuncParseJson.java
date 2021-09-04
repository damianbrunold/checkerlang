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
import ch.checkerlang.values.*;

import java.util.Arrays;
import java.util.List;

public class FuncParseJson extends FuncBase {
    public FuncParseJson() {
        super("parse_json");
        this.info = "parse_json(s)\r\n" +
                "\r\n" +
                "Parses the JSON string s and returns a map or list.\r\n" +
                "\r\n" +
                ": parse_json('{\"a\": 12, \"b\": [1, 2, 3, 4]}') ==> '<<<\\\'a\\\' => 12, \\\'b\\\' => [1, 2, 3, 4]>>>'\r\n" +
                ": parse_json('[1, 2.5, 3, 4]') ==> '[1, 2.5, 3, 4]'\r\n";
    }

    public List<String> getArgNames() {
        return Arrays.asList("s");
    }

    public Value execute(Args args, Environment environment, SourcePos pos) {
        try {
            return JSON.parse(args.getString("s").getValue());
        } catch (Exception e) {
            throw new ControlErrorException("Cannot parse string as JSON", pos);
        }
    }
}
