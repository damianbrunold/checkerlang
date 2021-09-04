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
    public class FuncSetSeed : FuncBase
    {
        public FuncSetSeed() : base("set_seed")
        {
            info = "set_seed(n)\r\n" +
                   "\r\n" +
                   "Sets the seed of the random number generator to n.\r\n" +
                   "\r\n" +
                   ": set_seed(1) ==> 1\r\n";
        }
        
        public override List<string> GetArgNames()
        {
            return new List<string> {"n"};
        }
        
        public override Value Execute(Args args, Environment environment, SourcePos pos)
        {
            var seed = (int) args.GetInt("n").GetValue();
            FuncRandom.random = new Random(seed);
            return new ValueInt(seed);
        }
    }
}