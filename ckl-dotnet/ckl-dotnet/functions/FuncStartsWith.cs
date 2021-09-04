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
using System.Collections.Generic;

namespace CheckerLang
{
    public class FuncStartsWith : FuncBase
    {
        public FuncStartsWith() : base("starts_with")
        {
            info = "starts_with(str, part)\r\n" +
                   "\r\n" +
                   "Returns TRUE if the string str starts with part.\r\n" +
                   "\r\n" +
                   ": starts_with('abcdef', 'abc') ==> TRUE\r\n" +
                   ": starts_with(NULL, 'abc') ==> FALSE\r\n";
        }
        
        public override List<string> GetArgNames()
        {
            return new List<string> {"str", "part"};
        }
        
        public override Value Execute(Args args, Environment environment, SourcePos pos)
        {
            if (args.IsNull("str")) return ValueBoolean.FALSE;
            return ValueBoolean.From(args.GetString("str").GetValue().StartsWith(args.GetString("part").GetValue()));
        }
    }
    
}