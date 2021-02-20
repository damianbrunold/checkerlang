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
using System;
using System.Collections.Generic;

namespace CheckerLang
{
    public class FuncRandom : FuncBase
    {
        public static Random random = new Random();
        
        public FuncRandom() : base("random")
        {
            info = "random()\r\n" +
                   "random(a)\r\n" +
                   "random(a, b)\r\n" +
                   "\r\n" +
                   "Returns a random number. If no argument is provided, a decimal\r\n" +
                   "value in the range [0, 1) is returned. If only a is provided, then \r\n" +
                   "an int value in the range [0, a) is returned. If both a and b are\r\n" +
                   "provided, then an int value in the range [a, b) is returned.\r\n" +
                   "\r\n" +
                   ": set_seed(1); random(5) ==> 1\r\n";
        }
        
        public override List<string> GetArgNames()
        {
            return new List<string> {"a", "b"};
        }
        
        public override Value Execute(Args args, Environment environment, SourcePos pos)
        {
            if (args.HasArg("a") && !args.HasArg("b"))
            {
                return new ValueInt(random.Next((int) args.GetInt("a").GetValue()));
            }

            if (args.HasArg("a") && args.HasArg("b"))
            {
                return new ValueInt(random.Next((int) args.GetInt("a").GetValue(), (int) args.GetInt("b").GetValue()));
            }
            return new ValueDecimal((decimal) random.NextDouble());
        }
    }
}