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
import ch.checkerlang.ControlErrorException;
import ch.checkerlang.Environment;
import ch.checkerlang.SourcePos;
import ch.checkerlang.values.Value;

import java.util.Arrays;
import java.util.List;

public class FuncInsertAt extends FuncBase {
    public FuncInsertAt() {
        super("insert_at");
        this.info = "insert_at(lst, index, value)\r\n" +
                "\r\n" +
                "Inserts the element at the given index of the list lst.\r\n" +
                "The list is changed in place. Returns the changed list.\r\n" +
                "If index is out of bounds, the list is not changed at all.\r\n" +
                "\r\n" +
                ": insert_at([1, 2, 3], 0, 9) ==> [9, 1, 2, 3]\r\n" +
                ": insert_at([1, 2, 3], 2, 9) ==> [1, 2, 9, 3]\r\n" +
                ": insert_at([1, 2, 3], 3, 9) ==> [1, 2, 3, 9]\r\n" +
                ": insert_at([1, 2, 3], -1, 9) ==> [1, 2, 3, 9]\r\n" +
                ": insert_at([1, 2, 3], -2, 9) ==> [1, 2, 9, 3]\r\n" +
                ": insert_at([1, 2, 3], 4, 9) ==> [1, 2, 3]\r\n";
    }

    public List<String> getArgNames() {
        return Arrays.asList("lst", "index", "value");
    }

    public Value execute(Args args, Environment environment, SourcePos pos) {
        Value lst = args.get("lst");

        if (!lst.isList()) throw new ControlErrorException("Cannot insert into obj of type " + lst.type(), pos);

        int index = (int) args.getInt("index").getValue();
        if (index < 0) index = lst.asList().getValue().size() + index + 1;
        Value value = args.get("value");

        List<Value> list = lst.asList().getValue();
        if (index < 0 || index > list.size()) return lst;
        if (index == list.size()) list.add(value);
        else list.add(index, value);
        return lst;
    }
}
