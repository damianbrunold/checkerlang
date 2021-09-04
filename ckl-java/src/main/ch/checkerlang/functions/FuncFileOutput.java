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
import ch.checkerlang.values.ValueBoolean;
import ch.checkerlang.values.ValueOutput;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

public class FuncFileOutput extends FuncBase {
    public FuncFileOutput() {
        super("file_output");
        info = "file_output(filename, encoding = 'UTF-8', append = FALSE)\r\n" +
                "\r\n" +
                "Returns an output object, that writes to the given file. If\r\n" +
                "the file exists it is overwritten.\r\n";
    }

    public boolean isSecure() {
        return false;
    }

    public List<String> getArgNames() {
        return Arrays.asList("filename", "encoding", "append");
    }

    public Value execute(Args args, Environment environment, SourcePos pos) {
        String filename = args.getString("filename").getValue();
        Charset encoding = StandardCharsets.UTF_8;
        if (args.hasArg("encoding")) {
            encoding = Charset.forName(args.getString("encoding").getValue());
        }
        ValueBoolean append = ValueBoolean.FALSE;
        if (args.hasArg("append")) append = args.get("append").asBoolean();
        try {
            return new ValueOutput(new OutputStreamWriter(new FileOutputStream(filename, append.getValue()), encoding));
        } catch (IOException e) {
            throw new ControlErrorException("Cannot open file " + filename, pos);
        }
    }
}
