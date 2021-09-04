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
    public class FuncPairs : FuncBase
    {
        public FuncPairs() : base("pairs")
        {
            info = "pairs(lst)\r\n" + 
                   "\r\n" + 
                   "Returns a list where each entry consists of a pair\r\n" + 
                   "of elements of lst.\r\n" + 
                   "\r\n" + 
                   ": pairs(NULL) ==> NULL\r\n" + 
                   ": pairs([]) ==> []\r\n" + 
                   ": pairs([1]) ==> []\r\n" + 
                   ": pairs([1, 2]) ==> [[1, 2]]\r\n" + 
                   ": pairs([1, 2, 3]) ==> [[1, 2], [2, 3]]\r\n" + 
                   ": pairs([1, 2, 3, 4]) ==> [[1, 2], [2, 3], [3, 4]]\r\n";
        }
        
        public override List<string> GetArgNames()
        {
            return new List<string> {"lst"};
        }
        
        public override Value Execute(Args args, Environment environment, SourcePos pos)
        {
            if (args.IsNull("lst")) return ValueNull.NULL;
            var lst = args.GetList("lst").GetValue();
            var result = new ValueList();
            for (var i = 0; i < lst.Count - 1; i++)
            {
                var pair = new ValueList();
                pair.AddItem(lst[i]);
                pair.AddItem(lst[i + 1]);
                result.AddItem(pair);
            }
            return result;
        }
    }
}